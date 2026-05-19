import sys

with open('d:/GrowersNotebook/apps/web/components/messages-panel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx_start = content.rfind('\n  return (')
if idx_start == -1:
    print("ERROR: Could not find return statement")
    sys.exit(1)

print(f"Return block starts at index {idx_start}")

new_return = '''
  return (
    <div className="space-y-3">
      {lightbox ? (
        <DmImageLightbox
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      ) : null}
      {showNewMessageModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowNewMessageModal(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-2xl bg-[var(--gn-surface-1,var(--gn-surface-elevated))] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-semibold text-[var(--gn-text)]">
              New Message
            </h2>
            <input
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search by username\u2026"
              className="gn-input mb-4 w-full"
              autoFocus
            />
            {userSearchLoading ? (
              <p className="text-xs text-[var(--gn-text-muted)]">Searching\u2026</p>
            ) : userSearchQuery.trim().length > 0 &&
              userSearchQuery.trim().length < 2 ? (
              <p className="text-xs text-[var(--gn-text-muted)]">
                Type at least 2 characters.
              </p>
            ) : userSearchResults.length === 0 &&
              debouncedUserSearch.length >= 2 ? (
              <p className="text-xs text-[var(--gn-text-muted)]">
                No users found.
              </p>
            ) : null}
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {userSearchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => startConversation(user)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-[var(--gn-surface-hover)]"
                >
                  <MiniAvatar
                    name={user.displayName?.trim() || "Grower"}
                    size={32}
                  />
                  <span className="text-sm font-medium text-[var(--gn-text)]">
                    {user.displayName?.trim() || "Grower"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {actionError ? (
        <div
          className="rounded-lg border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm text-[var(--gn-text)]"
          role="alert"
        >
          <p className="font-medium text-red-700 dark:text-red-400">Messaging</p>
          <p className="mt-1 text-[var(--gn-text-muted)]">{actionError}</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[var(--gn-accent)] hover:underline"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Main messaging panel */}
      <div className="overflow-hidden rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-raised)] shadow-[var(--gn-shadow-md)]">
        <div className="flex min-h-[540px] flex-col lg:flex-row">

          {/* Left: conversation list */}
          <div className="flex w-full shrink-0 flex-col border-b border-[var(--gn-divide)] lg:w-72 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-[var(--gn-divide)] px-4 py-3">
              <h2 className="text-sm font-bold text-[var(--gn-text)]">Messages</h2>
              <button
                type="button"
                onClick={() => setShowNewMessageModal(true)}
                className="flex items-center gap-1 rounded-full bg-[var(--gn-accent)] px-3 py-1 text-xs font-semibold text-white transition hover:brightness-110"
              >
                + New
              </button>
            </div>
            <ul className="flex-1 divide-y divide-[var(--gn-divide)] overflow-y-auto">
              {threads.length === 0 ? (
                <li className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[var(--gn-text)]">No conversations</p>
                  <p className="mt-1 text-xs text-[var(--gn-text-muted)]">
                    Message someone from their profile page.
                  </p>
                </li>
              ) : (
              threads.map((t) => (
                <li key={t.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`cursor-pointer px-4 py-3 transition-colors ${
                      t.id === activeThreadId
                        ? "bg-[var(--gn-surface-muted)]"
                        : "hover:bg-[var(--gn-surface-hover)]"
                    }`}
                    onClick={() => void selectThread(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void selectThread(t.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="relative mt-0.5 shrink-0">
                        <MiniAvatar
                          name={displayNameFor(t.peer.id, selfId, t.peer)}
                          size={40}
                        />
                        {t.unread ? (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--gn-surface-raised)] bg-[var(--gn-accent)]"
                            aria-label="Unread messages"
                          />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`truncate text-sm font-semibold ${t.unread ? "text-[var(--gn-text)]" : "text-[var(--gn-text-muted)]"}`}
                          >
                            <Link
                              href={`/u/${t.peer.id}`}
                              className="hover:text-[var(--gn-accent)] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {displayNameFor(t.peer.id, selfId, t.peer)}
                            </Link>
                          </span>
                          {t.lastMessageAt ? (
                            <span className="shrink-0 text-[10px] text-[var(--gn-text-muted)]">
                              {new Date(t.lastMessageAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          ) : null}
                        </div>
                        {(() => {
                          const preview = threadPreviewLine(t.lastMessage);
                          if (!preview) return null;
                          const short =
                            preview.length > 36
                              ? `${preview.slice(0, 36)}\u2026`
                              : preview;
                          return (
                            <span
                              className={`mt-0.5 block truncate text-xs ${t.unread ? "font-medium text-[var(--gn-text)]" : "text-[var(--gn-text-muted)]"}`}
                            >
                              {short}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </li>
              ))
              )}
            </ul>
          </div>

          {/* Right: active conversation */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Chat header */}
            <div className="flex min-h-[52px] items-center gap-3 border-b border-[var(--gn-divide)] px-4 py-3">
              {openingFromQuery ? (
                <p className="text-sm text-[var(--gn-text-muted)]">Opening chat\u2026</p>
              ) : activePeer ? (
                <>
                  <MiniAvatar
                    name={displayNameFor(activePeer.id, selfId, activePeer)}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/u/${activePeer.id}`}
                      className="block truncate text-sm font-bold text-[var(--gn-text)] hover:text-[var(--gn-accent)] hover:underline"
                    >
                      {displayNameFor(activePeer.id, selfId, activePeer)}
                    </Link>
                    <span className="flex items-center gap-1.5 text-[10px] text-[var(--gn-text-muted)]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Growers Notebook member
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--gn-text-muted)]">
                  {hasNoThreads
                    ? "Start a conversation from a profile page"
                    : "Select a conversation"}
                </p>
              )}
            </div>

            {/* Message timeline */}
            <div
              ref={timelineRef}
              onScroll={onTimelineScroll}
              className="gn-messages-timeline flex flex-1 flex-col gap-3 overflow-y-auto p-4"
              style={{ minHeight: "260px", maxHeight: "clamp(260px, 50vh, 420px)" }}
            >
              {!activeThreadId ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <span className="text-4xl" aria-hidden>&#128172;</span>
                  <p className="text-sm text-[var(--gn-text-muted)]">
                    Select a conversation to read and reply
                  </p>
                </div>
              ) : (
                <>
                  {hasMore ? (
                    <div className="flex justify-center pb-1">
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--gn-accent)] hover:underline disabled:opacity-50"
                        disabled={loadingOlder}
                        onClick={() => void loadOlder()}
                      >
                        {loadingOlder ? "Loading\u2026" : "Load earlier messages"}
                      </button>
                    </div>
                  ) : null}
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-[var(--gn-text-muted)]">
                        No messages yet. Say hello!
                      </p>
                    </div>
                  ) : (
                    messages.map((ln) => {
                      const imgs = messageImageUrls(ln);
                      const share = firstPostShareMatch(ln.body);
                      const caption = share
                        ? captionWithoutShareUrl(ln.body, share.fullUrl).trim()
                        : ln.body.trim();
                      const showPostEmbed = Boolean(share);
                      const hasText = caption.length > 0;
                      const hasMedia = imgs.length > 0;
                      const isSelf = Boolean(selfId && ln.senderId === selfId);
                      const peerDisplay = displayNameFor(
                        ln.senderId,
                        selfId,
                        activePeer,
                      );
                      return (
                        <div
                          key={ln.id}
                          className={`flex items-end gap-2 ${isSelf ? "justify-end" : "justify-start"}`}
                        >
                          {!isSelf && (
                            <MiniAvatar name={peerDisplay} size={26} />
                          )}
                          <div
                            className={`text-sm ${imgs.length > 1 ? "overflow-visible" : ""} ${
                              isSelf
                                ? "ml-auto max-w-[72%] rounded-2xl rounded-br-sm bg-[var(--gn-surface-elevated)] px-4 py-2.5 text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)]"
                                : "mr-auto max-w-[72%] rounded-2xl rounded-bl-sm border border-[var(--gn-divide)] bg-[var(--gn-surface-raised)] px-4 py-2.5 text-[var(--gn-text)]"
                            }`}
                            style={isSelf ? { borderLeft: "3px solid var(--gn-accent)" } : undefined}
                          >
                            {hasText ? (
                              <p className="whitespace-pre-wrap break-words">
                                {caption}
                              </p>
                            ) : null}
                            {showPostEmbed && share ? (
                              <DmSharedPostEmbed postId={share.postId} />
                            ) : null}
                            {(hasText || showPostEmbed) && hasMedia ? (
                              <div
                                className="my-2 border-t border-[var(--gn-divide)]"
                                role="separator"
                              />
                            ) : null}
                            {hasMedia ? (
                              <div className="overflow-visible">
                                <StackedDmStyleImages
                                  urls={imgs}
                                  stackKey={ln.id}
                                  pileLabel={dmAttachmentPileLabel(
                                    imgs,
                                    isSelf,
                                    peerDisplay,
                                  )}
                                  onOpen={(index) =>
                                    setLightbox({ urls: imgs, index })
                                  }
                                />
                              </div>
                            ) : null}
                            {isSelf ? (
                              <div className="mt-1 flex justify-end">
                                <button
                                  type="button"
                                  disabled={messageDeletingId === ln.id}
                                  onClick={() => void removeOwnMessage(ln.id)}
                                  className="text-[11px] font-normal text-[var(--gn-text-muted)] hover:text-[var(--gn-text)] hover:underline disabled:opacity-45"
                                >
                                  {messageDeletingId === ln.id
                                    ? "Removing\u2026"
                                    : "Delete"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>

            {/* Compose area */}
            <div className="space-y-2 border-t border-[var(--gn-divide)] p-3">
              <input
                id={dmAttachInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => void onMediaFileChange(e)}
              />
              {pendingAttachments.length > 0 ? (
                <div className="rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-xs text-[var(--gn-text-muted)]">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[var(--gn-text)]">
                      {pendingAttachmentsHeadline(pendingAttachments)}{" "}
                      {pendingAttachments.some((a) => a.uploading)
                        ? "(uploading\u2026)"
                        : pendingAttachments.every((a) => a.remoteUrl)
                          ? "ready"
                          : ""}
                    </span>
                    <button
                      type="button"
                      className="font-semibold text-[var(--gn-accent)] hover:underline"
                      onClick={() => {
                        setPendingAttachments((prev) => {
                          for (const a of prev) revokePendingLocal(a);
                          return [];
                        });
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((att, i) => {
                      const src = att.remoteUrl ?? att.localBlobUrl ?? "";
                      const showVideo =
                        Boolean(src) &&
                        (att.kind === "video" ||
                          isDmVideoUrl(att.remoteUrl ?? ""));
                      return (
                        <div
                          key={att.id}
                          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] sm:h-16 sm:w-16"
                        >
                          {showVideo ? (
                            <video
                              src={src}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-contain"
                              aria-label="Video preview"
                            />
                          ) : src ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={src}
                              alt=""
                              className="h-full w-full object-contain"
                            />
                          ) : null}
                          {att.uploading ? (
                            <div
                              className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] font-medium text-white"
                              aria-hidden
                            >
                              \u2026
                            </div>
                          ) : null}
                          {att.error ? (
                            <div
                              className="absolute inset-0 flex items-center justify-center bg-red-600/85 p-1 text-center text-[9px] font-medium leading-tight text-white"
                              title={att.error}
                            >
                              Failed
                            </div>
                          ) : null}
                          <button
                            type="button"
                            className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--gn-surface)] bg-[var(--gn-text)] text-sm font-light leading-none text-[var(--gn-surface)] shadow-md hover:bg-[var(--gn-text-muted)]"
                            aria-label={`Remove attachment ${i + 1}`}
                            onClick={() => removePendingAttachment(att.id)}
                          >
                            \u00d7
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <ComposerQuickReactionsToolbar
                disabled={!activeThreadId}
                onEmojiAppend={(emoji) => setDraft((t) => t + emoji)}
                gifSlot={
                  <button
                    type="button"
                    disabled={
                      !selfId ||
                      !activeThreadId ||
                      pendingAttachments.length >= DM_ATTACH_MAX ||
                      pendingHasUploads
                    }
                    className="inline-flex h-8 shrink-0 items-center rounded-full border border-[var(--gn-border)] bg-[var(--gn-surface-elevated)]/90 px-3 text-xs font-semibold text-[var(--gn-text)] shadow-[var(--gn-shadow-sm)] transition hover:bg-[var(--gn-surface-hover)] disabled:pointer-events-none disabled:opacity-35"
                    onClick={() => setGifPickerOpen((o) => !o)}
                  >
                    GIF
                  </button>
                }
              />
              {gifPickerOpen && selfId && activeThreadId ? (
                <div className="rounded-xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] p-3">
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="gn-input min-w-[12rem] flex-1 px-2 py-1.5 text-sm"
                      placeholder="Search Giphy\u2026"
                      value={gifQuery}
                      aria-busy={gifLoading}
                      onChange={(e) => setGifQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void runGifSearch(gifQuery);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-full bg-[var(--gn-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--gn-text)] ring-1 ring-[var(--gn-divide)] hover:bg-[var(--gn-surface-hover)]"
                      onClick={() => void runGifSearch(gifQuery)}
                    >
                      {gifLoading ? "\u2026" : "Search now"}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-[var(--gn-text-muted)]">
                    One GIF per message, and not with photos or videos. Powered by
                    Giphy. Results update as you type (after a short pause).
                  </p>
                  {gifQuery.trim().length > 0 && gifQuery.trim().length < 2 ? (
                    <p className="mt-1 text-[10px] text-[var(--gn-text-muted)]">
                      Type at least 2 characters.
                    </p>
                  ) : null}
                  {gifItems.length > 0 ? (
                    <div
                      className="gn-scrollbar-themed gn-scrollbar-giphy mt-3 max-h-[min(52vh,440px)] overflow-y-scroll overscroll-contain rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface)]/40 py-2 pl-1 pr-2"
                      role="region"
                      aria-label="Giphy search results"
                    >
                      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {gifItems.map((g, gi) => (
                          <li key={g.id ?? `${g.url}-${gi}`}>
                            <button
                              type="button"
                              className="relative block w-full touch-manipulation overflow-hidden rounded-lg ring-1 ring-[var(--gn-divide)] hover:ring-[#ff6a38]"
                              title={g.title}
                              onClick={() => addGifAttachment(g.url)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={g.preview}
                                alt=""
                                className="h-16 w-full object-cover sm:h-20"
                                loading="lazy"
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--gn-border)] bg-[var(--gn-surface-muted)] px-4 py-2.5 transition-shadow focus-within:ring-1 focus-within:ring-[var(--gn-accent)]/40">
                {!activeThreadId ||
                pendingAttachments.length >= DM_ATTACH_MAX ? (
                  <span
                    className="shrink-0 cursor-not-allowed text-sm font-medium text-[var(--gn-text-muted)] opacity-50"
                    aria-disabled
                  >
                    Media
                  </span>
                ) : (
                  <label
                    htmlFor={dmAttachInputId}
                    className="shrink-0 cursor-pointer touch-manipulation select-none text-sm font-medium text-[var(--gn-text-muted)] transition-colors hover:text-[var(--gn-text)]"
                  >
                    Media
                  </label>
                )}
                <input
                  className="flex-1 border-0 bg-transparent text-sm text-[var(--gn-text)] placeholder:text-[var(--gn-text-muted)] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message\u2026"
                  disabled={!activeThreadId}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-full bg-[var(--gn-accent)] px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  disabled={(() => {
                    if (!activeThreadId) return true;
                    const uploading = pendingAttachments.some((a) => a.uploading);
                    const hasErr = pendingAttachments.some((a) => a.error);
                    const remotes = pendingAttachments.filter((a) => a.remoteUrl);
                    const incomplete =
                      pendingAttachments.length > 0 &&
                      remotes.length !== pendingAttachments.length;
                    if (uploading || hasErr || incomplete) return true;
                    return !draft.trim() && remotes.length === 0;
                  })()}
                  onClick={() => void sendMessage()}
                >
                  Send
                </button>
              </div>
              <details className="relative inline-block">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-[var(--gn-text-muted)] hover:text-[var(--gn-text)] [&::-webkit-details-marker]:hidden">
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--gn-divide)] text-[10px] font-bold leading-none"
                    aria-hidden
                  >
                    i
                  </span>
                  Privacy info
                </summary>
                <div className="absolute bottom-6 left-0 z-20 w-72 rounded-xl border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] p-3 text-xs leading-relaxed text-[var(--gn-text-muted)] shadow-[var(--gn-shadow-md)]">
                  Private between you and the other person on GrowersNotebook,
                  like typical app messages. Content is readable by the service
                  when needed for safety and operations\u2014not end-to-end encrypted
                  from Growers (similar to default Messenger, not Signal-style
                  encryption).
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {hasNoThreads ? (
        <div className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--gn-text)]">No conversations yet</p>
          <p className="mt-1.5 leading-relaxed text-[var(--gn-text-muted)]">
            New chats start from a profile: follow someone, then use{" "}
            <span className="font-medium text-[var(--gn-text)]">Message</span> on
            their page. Open chats will show in the list here.
          </p>
        </div>
      ) : null}
    </div>
  );
}
'''

new_content = content[:idx_start] + new_return

with open('d:/GrowersNotebook/apps/web/components/messages-panel.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Written {len(new_content)} chars. Done!")
