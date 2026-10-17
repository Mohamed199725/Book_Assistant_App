'use client';

// Create hooks/useVapi.ts: the core hook. Initializes Vapi SDK, manages call lifecycle (idle, connecting, starting, listening, thinking, speaking), tracks messages array + currentMessage streaming, handles duration timer with maxDuration enforcement, session tracking via server actions

import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { useAuth } from '@clerk/nextjs';

import { useSubscription } from '@/hooks/useSubscription';
import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from '@/lib/constants';
import { getVoice } from '@/lib/utils';
import { IBook, Messages } from '@/types';
import { startVoiceSession, endVoiceSession } from '@/lib/actions/session.actions';

export function useLatestRef<T>(value: T) {
    const ref = useRef(value);

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
const TIMER_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;

let vapi: InstanceType<typeof Vapi>;
function getVapi() {
    if (!vapi) {
        if (!VAPI_API_KEY) {
            throw new Error('NEXT_PUBLIC_VAPI_API_KEY environment variable is not set');
        }
        vapi = new Vapi(VAPI_API_KEY);
    }
    return vapi;
}

export type CallStatus = 'idle' | 'connecting' | 'starting' | 'listening' | 'thinking' | 'speaking';

// Vapi emits errors as `Error` instances in some paths and as plain objects
// (e.g. `{ error: '...' }`) in others. Reading `.message` blindly yields
// `undefined` and collapses every failure into the same generic message.
function describeVapiError(error: unknown): string {
    const raw = [
        error instanceof Error ? error.message : undefined,
        typeof error === 'object' && error !== null
            ? ((error as { error?: string; message?: string }).error ??
              (error as { message?: string }).message)
            : undefined,
        typeof error === 'string' ? error : undefined,
    ]
        .filter((part): part is string => typeof part === 'string' && part.length > 0)
        .join(' ');

    const message = raw.toLowerCase();

    if (message.includes('permission') || message.includes('notallowed')) {
        return 'Microphone access was blocked. Allow microphone permissions and try again.';
    }
    if (message.includes('timeout') || message.includes('silence')) {
        return 'Session ended due to inactivity. Click the mic to start again.';
    }
    if (message.includes('network') || message.includes('connection')) {
        return 'Connection lost. Please check your internet and try again.';
    }
    if (message.includes('ejected') || message.includes('meeting has ended')) {
        return 'The voice session was ended by the server. Click the mic to start again.';
    }

    return raw
        ? `Session ended: ${raw}`
        : 'Session ended unexpectedly. Click the mic to start again.';
}

export function useVapi(book: IBook) {
    const { userId } = useAuth();
    const { limits } = useSubscription();

    const [status, setStatus] = useState<CallStatus>('idle');
    const [messages, setMessages] = useState<Messages[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [currentUserMessage, setCurrentUserMessage] = useState('');
    const [duration, setDuration] = useState(0);
    const [limitError, setLimitError] = useState<string | null>(null);
    const [isBillingError, setIsBillingError] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const isStoppingRef = useRef(false);

    // Keep refs in sync with latest values for use in callbacks
    const maxDurationSeconds = limits?.maxDurationPerSession ? limits.maxDurationPerSession * 60 : (15 * 60);
    const maxDurationRef = useLatestRef(maxDurationSeconds);
    const durationRef = useLatestRef(duration);
    const voice = book.persona || DEFAULT_VOICE;

    // Set up Vapi event listeners
    useEffect(() => {
        const handlers = {
            'call-start': () => {
                isStoppingRef.current = false;
                setStatus('starting'); // AI speaks first, wait for it
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Start duration timer
                startTimeRef.current = Date.now();
                setDuration(0);
                timerRef.current = setInterval(() => {
                    if (startTimeRef.current) {
                        const newDuration = Math.floor((Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS);
                        setDuration(newDuration);

                        // Check duration limit
                        if (newDuration >= maxDurationRef.current) {
                            // Clear first - otherwise this fires every second,
                            // calling stop() repeatedly and re-setting the error.
                            if (timerRef.current) {
                                clearInterval(timerRef.current);
                                timerRef.current = null;
                            }
                            startTimeRef.current = null;

                            isStoppingRef.current = true;
                            getVapi().stop();
                            setStatus('idle');
                            setLimitError(
                                `Session time limit (${Math.floor(
                                    maxDurationRef.current / SECONDS_PER_MINUTE,
                                )} minutes) reached. Upgrade your plan for longer sessions.`,
                            );
                        }
                    }
                }, TIMER_INTERVAL_MS);
            },

            'call-end': () => {
                // Don't reset isStoppingRef here - delayed events may still fire
                setStatus('idle');
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Stop timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                // End session tracking
                if (sessionIdRef.current) {
                    endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                        console.error('Failed to end voice session:', err),
                    );
                    sessionIdRef.current = null;
                }

                startTimeRef.current = null;
            },

            'speech-start': () => {
                if (!isStoppingRef.current) {
                    setStatus('speaking');
                }
            },
            'speech-end': () => {
                if (!isStoppingRef.current) {
                    // After AI finishes speaking, user can talk
                    setStatus('listening');
                }
            },

            message: (message: {
                type: string;
                role: string;
                transcriptType: string;
                transcript: string;
            }) => {
                if (message.type !== 'transcript') return;

                // User finished speaking → AI is thinking
                if (message.role === 'user' && message.transcriptType === 'final') {
                    if (!isStoppingRef.current) {
                        setStatus('thinking');
                    }
                    setCurrentUserMessage('');
                }

                // Partial user transcript → show real-time typing
                if (message.role === 'user' && message.transcriptType === 'partial') {
                    setCurrentUserMessage(message.transcript);
                    return;
                }

                // Partial AI transcript → show word-by-word
                if (message.role === 'assistant' && message.transcriptType === 'partial') {
                    setCurrentMessage(message.transcript);
                    return;
                }

                // Final transcript → add to messages
                if (message.transcriptType === 'final') {
                    if (message.role === 'assistant') setCurrentMessage('');
                    if (message.role === 'user') setCurrentUserMessage('');

                    setMessages((prev) => {
                        const isDupe = prev.some(
                            (m) => m.role === message.role && m.content === message.transcript,
                        );
                        return isDupe ? prev : [...prev, { role: message.role, content: message.transcript }];
                    });
                }
            },

            error: (error: Error | { error?: string; message?: string }) => {
                console.error('Vapi error:', error);
                // Don't reset isStoppingRef here - delayed events may still fire
                setStatus('idle');
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Stop timer on error
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                // End session tracking on error
                if (sessionIdRef.current) {
                    endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                        console.error('Failed to end voice session on error:', err),
                    );
                    sessionIdRef.current = null;
                }

                setLimitError(describeVapiError(error));

                startTimeRef.current = null;
            },

            // Structured failure emitted when the call never comes up (bad
            // assistant id, provider error, quota, mic permission, etc.).
            // Without this the reason is lost and the user only sees a
            // generic "ended unexpectedly".
            'call-start-failed': (event: {
                stage: string;
                error: string;
                context?: Record<string, unknown>;
            }) => {
                console.error('Vapi call failed to start:', event);
                setStatus('idle');

                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                if (sessionIdRef.current) {
                    endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                        console.error('Failed to end voice session on start failure:', err),
                    );
                    sessionIdRef.current = null;
                }

                setLimitError(
                    `Could not start the voice session (${event.stage}). ${event.error}`,
                );

                startTimeRef.current = null;
            },

            // The Daily transport dropped. This is the event behind
            // "send transport changed to disconnected" - the UI must not keep
            // pretending the call is live, or the user talks into a dead room.
            'network-connection': (event: { connection?: string }) => {
                console.warn('Vapi network connection:', event);

                if (event.connection === 'disconnected') {
                    if (isStoppingRef.current) return;

                    setStatus('idle');
                    setCurrentMessage('');
                    setCurrentUserMessage('');

                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }

                    if (sessionIdRef.current) {
                        endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                            console.error('Failed to end voice session on disconnect:', err),
                        );
                        sessionIdRef.current = null;
                    }

                    setLimitError('Connection to the voice session was lost. Click the mic to start again.');

                    startTimeRef.current = null;
                }
            },
        };

        // Register all handlers
        Object.entries(handlers).forEach(([event, handler]) => {
            getVapi().on(event as keyof typeof handlers, handler as () => void);
        });

        return () => {
            // End active session on unmount
            const activeSessionId = sessionIdRef.current;
            const elapsedDuration = durationRef.current;

            if (activeSessionId) {
                getVapi().stop();
                endVoiceSession(activeSessionId, elapsedDuration).catch((err) =>
                    console.error('Failed to end voice session on unmount:', err),
                );
                sessionIdRef.current = null;
            }
            // Cleanup handlers
            Object.entries(handlers).forEach(([event, handler]) => {
                getVapi().off(event as keyof typeof handlers, handler as () => void);
            });
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const start = useCallback(async () => {
        if (!userId) {
            setLimitError('Please sign in to start a voice session.');
            return;
        }

        setLimitError(null);
        setIsBillingError(false);
        setStatus('connecting');

        try {
            // Check session limits and create session record
            const result = await startVoiceSession(userId, book._id);

            if (!result.success) {
                setLimitError(result.error || 'Session limit reached. Please upgrade your plan.');
                setIsBillingError(!!result.isBillingError);
                setStatus('idle');
                return;
            }

            sessionIdRef.current = result.sessionId || null;

            const firstMessage = `Hey, good to meet you. Quick question before we dive in - have you actually read ${book.title} yet, or are we starting fresh?`;

            await getVapi().start(ASSISTANT_ID, {
                firstMessage,
                variableValues: {
                    title: book.title,
                    author: book.author,
                    bookId: book._id,
                },
                voice: {
                    provider: '11labs' as const,
                    voiceId: getVoice(voice).id,
                    model: 'eleven_turbo_v2_5' as const,
                    stability: VOICE_SETTINGS.stability,
                    similarityBoost: VOICE_SETTINGS.similarityBoost,
                    style: VOICE_SETTINGS.style,
                    useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
                },
            });
        } catch (err) {
            console.error('Failed to start call:', err);
            setStatus('idle');

            // The session record was already created above, so close it out
            // here too - otherwise a failed start burns one of the user's
            // monthly sessions and leaves a dangling open record.
            if (sessionIdRef.current) {
                endVoiceSession(sessionIdRef.current, 0).catch((endErr) =>
                    console.error('Failed to end voice session after start error:', endErr),
                );
                sessionIdRef.current = null;
            }

            setLimitError(describeVapiError(err));
        }
    }, [book._id, book.title, book.author, voice, userId]);

    const stop = useCallback(() => {
        isStoppingRef.current = true;
        getVapi().stop();
    }, []);

    const clearError = useCallback(() => {
        setLimitError(null);
        setIsBillingError(false);
    }, []);

    const isActive =
        status === 'starting' ||
        status === 'listening' ||
        status === 'thinking' ||
        status === 'speaking';

    // Calculate remaining time
    // const maxDurationSeconds = limits.maxSessionMinutes * SECONDS_PER_MINUTE;
    // const remainingSeconds = Math.max(0, maxDurationSeconds - duration);
    // const showTimeWarning =
    //     isActive && remainingSeconds <= TIME_WARNING_THRESHOLD && remainingSeconds > 0;

    return {
        status,
        isActive,
        messages,
        currentMessage,
        currentUserMessage,
        duration,
        start,
        stop,
        limitError,
        isBillingError,
        maxDurationSeconds,
        clearError,
        // maxDurationSeconds,
        // remainingSeconds,
        // showTimeWarning,
    };
}

export default useVapi;