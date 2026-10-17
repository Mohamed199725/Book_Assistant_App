'use client';

import Link from "next/link";
import Image from "next/image";
import {usePathname} from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton, useUser, SignOutButton } from "@clerk/nextjs";
import {cn} from "@/lib/utils";

const navItems = [
    { label: "Library", href: "/" },
    { label: "Add New", href: "/books/new" },
    { label: "Pricing", href: "/subscriptions" },
]

const Navbar = () => {
    const pathName = usePathname();
    const { user } = useUser();

    return (
        <header className="w-full fixed z-50 bg-(--bg-primary)">
            <div className="wrapper navbar-height py-4 flex justify-between items-center">
                <Link href="/" className="flex gap-0.5 items-center">
                    <Image src="/assets/logo.png" alt="Bookfied" width={42} height={26} className="w-auto h-auto" />
                    <span className="logo-text">Bookified</span>
                </Link>

                <nav className="w-fit flex gap-7.5 items-center">
                    {navItems.map(({ label, href }) => {
                        const isActive = pathName === href || (href !== '/' && pathName.startsWith(href));

                        return (
                            <Link href={href} key={label} className={cn('nav-link-base', isActive ? 'nav-link-active' : 'text-black hover:opacity-70')}>
                                {label}
                            </Link>
                        )
                    })}

                    <div className="flex gap-7.5 items-center">
                        <Show when="signed-out">
                            <SignInButton mode="modal" />
                            <SignUpButton mode="modal" />
                        </Show>
                        
                        <Show when="signed-in">
                            {/* Added gap-4 here to separate the user info from the sign out button */}
                            <div className="nav-user-link flex items-center gap-4">
                                <UserButton />
                                
                                {user?.firstName && (
                                    <Link href="/subscriptions" className="nav-user-name">
                                        {user.firstName}
                                    </Link>
                                )}
                                
                                {/* RED BOX SIGN OUT BUTTON */}
                                <SignOutButton redirectUrl="/">
                                    <button className="bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-1.5 px-4 rounded-md transition-colors duration-200 shadow-sm">
                                        Sign Out
                                    </button>
                                </SignOutButton>
                                
                            </div>
                        </Show>
                    </div>
                </nav>
            </div>
        </header>
    )
}

export default Navbar