import { notFound } from "next/navigation";

import VapiControls from "@/components/VapiControls";
import { getBookBySlug } from "@/lib/actions/book.actions";
import { IBook } from "@/types";

const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;

    const result = await getBookBySlug(slug);

    if (!result.success || !result.data) {
        notFound();
    }

    const book = result.data as unknown as IBook;

    return (
        <main className="book-page-container">
            <VapiControls book={book} />
        </main>
    );
};

export default Page;
