"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import styles from "./create-article.module.css";

type Props = {
    value: string;
    onChange: (html: string) => void;
};

export default function RichTextEditor({ value, onChange }: Props) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value || "",
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) return;

        const current = editor.getHTML();
        const next = value || "<p></p>";

        if (current !== next) {
            editor.commands.setContent(next, { emitUpdate: false })
        }
    }, [editor, value]);

    if (!editor) return null;

    return (
        <div className={styles.richEditorWrap}>
            <div className={styles.richToolbar}>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`${styles.toolBtn} ${editor.isActive("bold") ? styles.toolBtnActive : ""}`}
                >
                    B
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`${styles.toolBtn} ${editor.isActive("italic") ? styles.toolBtnActive : ""}`}
                >
                    I
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`${styles.toolBtn} ${editor.isActive("bulletList") ? styles.toolBtnActive : ""}`}
                >
                    • List
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`${styles.toolBtn} ${editor.isActive("orderedList") ? styles.toolBtnActive : ""}`}
                >
                    1. List
                </button>
            </div>

            <EditorContent editor={editor} className={styles.richEditor} />
        </div>
    );
}