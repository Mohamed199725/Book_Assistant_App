import Link from "next/link";
import { BookX } from "lucide-react";

import { Button } from "@/components/ui/button";

const NotFound = () => {
    return (
        <main className="book-page-container">
            <div className="flex flex-col items-center justify-center gap-5 text-center min-h-[60vh]">
                <BookX className="size-16 text-[#663820]" />
                <h1 className="text-3xl sm:text-4xl font-bold font-serif text-[#212a3b]">
                    Book not found
                </h1>
                <p className="text-[#3d485e] max-w-md">
                    We couldn&apos;t find that book in the library. It may have been removed, or the
                    link might be incorrect.
                </p>
                <Button render={<Link href="/" />} className="form-btn w-fit">
                    Back to Library
                </Button>
            </div>
        </main>
    );
};

export default NotFound;
