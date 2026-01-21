'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { adaptIncidentNotes } from '@/lib/convex-adapters';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface IncidentNotesProps {
  tenantId: Id<'tenants'>;
  incidentId: Id<'incidents'>;
}

export function IncidentNotes({ tenantId, incidentId }: IncidentNotesProps) {
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user
  const currentUser = useQuery(api.users.getCurrentUser);

  // Get notes for this incident
  const notesRaw = useQuery(api.incidentNotes.listByIncident, { incidentId });
  const notes = notesRaw ? adaptIncidentNotes(notesRaw) : [];

  // Mutations
  const addNote = useMutation(api.incidentNotes.add);
  const updateNote = useMutation(api.incidentNotes.update);
  const removeNote = useMutation(api.incidentNotes.remove);

  // Check if user can manage notes
  // With simplified roles: owner and user can both add notes
  const isOwner = currentUser?.tenantRole === 'owner';
  const canAddNotes = !!currentUser; // Any authenticated user can add notes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      await addNote({
        tenantId,
        incidentId,
        content: newNote.trim(),
        authorId: currentUser._id as Id<'users'>,
        authorName: currentUser.name || currentUser.email,
      });
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (noteId: string, content: string) => {
    setEditingId(noteId);
    setEditContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || !editingId || !currentUser) return;

    try {
      await updateNote({
        id: editingId as Id<'incidentNotes'>,
        content: editContent.trim(),
        authorId: currentUser._id as Id<'users'>,
      });
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!currentUser) return;

    try {
      await removeNote({
        id: noteId as Id<'incidentNotes'>,
        authorId: currentUser._id as Id<'users'>,
        isAdmin: isOwner,
      });
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (notesRaw === undefined) {
    return <IncidentNotesSkeleton />;
  }

  return (
    <div className="rounded-lg border bg-card p-4 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Notes ({notes.length})</h2>
      </div>

      {/* Notes List */}
      {notes.length > 0 ? (
        <div className="space-y-4 mb-4">
          {notes.map((note) => {
            const isAuthor = currentUser?._id === note.authorId;
            const canEdit = isAuthor;
            const canDelete = isAuthor || isOwner;
            const isEditing = editingId === note.id;

            return (
              <div
                key={note.id}
                className="rounded-md border bg-muted/30 p-3 space-y-2"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px] resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{note.authorName}</span>
                        <span>{formatTimestamp(note.created)}</span>
                        {note.isEdited && (
                          <span className="italic">(edited)</span>
                        )}
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleEdit(note.id, note.content)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Note</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this note? This
                                    action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(note.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">
          No notes have been added to this incident yet.
        </p>
      )}

      {/* Add Note Form */}
      {canAddNotes && currentUser && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!newNote.trim() || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Add Note
            </Button>
          </div>
        </form>
      )}

      {!canAddNotes && (
        <p className="text-xs text-muted-foreground">
          Sign in to add notes.
        </p>
      )}
    </div>
  );
}

function IncidentNotesSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
