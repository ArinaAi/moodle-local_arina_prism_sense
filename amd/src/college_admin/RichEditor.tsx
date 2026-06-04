/**
 * Lightweight rich-text editor for the Curriculum modal.
 * Uses TipTap (ProseMirror) with StarterKit + Placeholder.
 */
import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Box, IconButton, Tooltip, Divider } from '@mui/material';
import { Bold, Italic, List, ListOrdered, Undo2, Redo2 } from 'lucide-react';

interface Props {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const RichEditor: React.FC<Props> = ({
    value,
    onChange,
    placeholder = 'Write the curriculum for this section…',
    disabled = false,
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder }),
        ],
        content: value || '',
        editable: !disabled,
        onUpdate: ({ editor: ed }) => {
            onChange(ed.getHTML());
        },
    });

    // Keep editable in sync with the disabled prop.
    useEffect(() => {
        if (!editor) { return; }
        editor.setEditable(!disabled);
    }, [disabled, editor]);

    // Sync external value changes when the modal opens for a different section.
    // The parent should set a `key` on this component to re-mount instead of
    // relying on this effect for large diffs, but this covers incremental cases.
    useEffect(() => {
        if (!editor || disabled) { return; }
        const current = editor.getHTML();
        if (value !== current) {
            editor.commands.setContent(value || '', { emitUpdate: false });
        }
    }, [value, editor, disabled]);

    // Convenience: prevent the toolbar buttons from stealing focus.
    const md = (fn: () => void) => (e: React.MouseEvent) => {
        e.preventDefault();
        fn();
    };

    const btnSx = (active: boolean) => ({
        p: '4px',
        borderRadius: '6px',
        color: active ? '#0f6cbf' : 'var(--ts)',
        background: active ? 'rgba(15,108,191,0.1)' : 'transparent',
        '&:hover': { background: active ? 'rgba(15,108,191,0.15)' : 'var(--rh)' },
    });

    const isB = editor?.isActive('bold') ?? false;
    const isI = editor?.isActive('italic') ?? false;
    const isBul = editor?.isActive('bulletList') ?? false;
    const isOrd = editor?.isActive('orderedList') ?? false;

    return (
        <Box sx={{
            border: '1px solid rgba(0,0,0,0.23)',
            borderRadius: '10px',
            overflow: 'hidden',
            transition: 'border-color 0.15s',
            '&:hover': { borderColor: disabled ? 'rgba(0,0,0,0.23)' : 'rgba(0,0,0,0.87)' },
            '&:focus-within': disabled ? {} : {
                outline: '2px solid #0f6cbf',
                outlineOffset: '-1px',
                borderColor: '#0f6cbf',
            },
        }}>
            {/* ── Toolbar ── */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: '2px',
                px: 1, py: '5px',
                borderBottom: '1px solid var(--border)',
                background: disabled ? 'rgba(0,0,0,0.04)' : 'var(--rh)',
            }}>
                <Tooltip title="Bold (⌘B)">
                    <span>
                        <IconButton size="small" disabled={disabled}
                            onMouseDown={md(() => editor?.chain().focus().toggleBold().run())}
                            sx={btnSx(isB)}>
                            <Bold size={14} />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Italic (⌘I)">
                    <span>
                        <IconButton size="small" disabled={disabled}
                            onMouseDown={md(() => editor?.chain().focus().toggleItalic().run())}
                            sx={btnSx(isI)}>
                            <Italic size={14} />
                        </IconButton>
                    </span>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: '4px', my: '3px' }} />

                <Tooltip title="Bullet list">
                    <span>
                        <IconButton size="small" disabled={disabled}
                            onMouseDown={md(() => editor?.chain().focus().toggleBulletList().run())}
                            sx={btnSx(isBul)}>
                            <List size={14} />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Numbered list">
                    <span>
                        <IconButton size="small" disabled={disabled}
                            onMouseDown={md(() => editor?.chain().focus().toggleOrderedList().run())}
                            sx={btnSx(isOrd)}>
                            <ListOrdered size={14} />
                        </IconButton>
                    </span>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: '4px', my: '3px' }} />

                <Tooltip title="Undo (⌘Z)">
                    <span>
                        <IconButton size="small"
                            disabled={disabled || !(editor?.can().undo() ?? false)}
                            onMouseDown={md(() => editor?.chain().focus().undo().run())}
                            sx={btnSx(false)}>
                            <Undo2 size={14} />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Redo (⌘⇧Z)">
                    <span>
                        <IconButton size="small"
                            disabled={disabled || !(editor?.can().redo() ?? false)}
                            onMouseDown={md(() => editor?.chain().focus().redo().run())}
                            sx={btnSx(false)}>
                            <Redo2 size={14} />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {/* ── Editable area ── */}
            <Box sx={{
                '& .ProseMirror': {
                    minHeight: 160,
                    maxHeight: 320,
                    overflowY: 'auto',
                    padding: '10px 14px',
                    fontSize: '0.875rem',
                    lineHeight: 1.65,
                    color: 'var(--tp)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: disabled ? 'default' : 'text',
                    // Placeholder
                    '& p.is-editor-empty:first-child::before': {
                        content: 'attr(data-placeholder)',
                        float: 'left',
                        color: 'var(--td)',
                        pointerEvents: 'none',
                        height: 0,
                    },
                    // Lists
                    '& ul': { paddingLeft: '1.5em', margin: '0.3em 0' },
                    '& ol': { paddingLeft: '1.5em', margin: '0.3em 0' },
                    '& li': { marginBottom: '0.15em' },
                    '& li > p': { margin: 0 },
                    // Paragraphs
                    '& p': { margin: '0 0 0.35em' },
                    '& p:last-child': { marginBottom: 0 },
                    // Inline
                    '& strong': { fontWeight: 700 },
                    '& em': { fontStyle: 'italic' },
                },
            }}>
                <EditorContent editor={editor} />
            </Box>
        </Box>
    );
};
