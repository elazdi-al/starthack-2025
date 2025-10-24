"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { toast } from "sonner";
import { ChatCircle, MegaphoneSimple, User, Heart, ArrowsClockwise, Sparkle, PencilSimple } from "phosphor-react";
import { usePublicClient, useWalletClient } from "wagmi";
import { EVENT_BOOK_ABI, EVENT_BOOK_ADDRESS } from "@/lib/contracts/eventBook";
import { currentChain } from "@/lib/chain";

interface Cast {
  hash: string;
  text: string;
  timestamp: string;
  author: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url?: string;
  };
  reactions?: {
    likes_count: number;
    recasts_count: number;
  };
}

interface NeynarCast {
  hash: string;
  text: string;
  timestamp: string;
  author: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url?: string;
  };
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
}

interface CommentsTabProps {
  eventId: number;
  eventTitle: string;
  farcasterURI: string;
  isEventOwner: boolean;
  creatorAddress: string;
  onFarcasterURIUpdate: (newURI: string) => void;
}

interface ConversationSummary {
  text: string;
  participants: Array<{
    fid: number;
    username: string;
    display_name: string;
    pfp_url?: string;
  }>;
  mentioned_profiles: Array<{
    fid: number;
    username: string;
    display_name: string;
    pfp_url?: string;
  }>;
}

export function CommentsTab({
  eventId,
  eventTitle,
  farcasterURI,
  isEventOwner,
  creatorAddress,
  onFarcasterURIUpdate,
}: CommentsTabProps) {
  const [comments, setComments] = useState<Cast[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isUpdatingContract, setIsUpdatingContract] = useState(false);
  const [conversationSummary, setConversationSummary] =
    useState<ConversationSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Use refs to prevent duplicate calls in React Strict Mode
  const summaryFetchedRef = useRef(false);
  const commentsFetchedRef = useRef(false);

  const publicClient = usePublicClient({ chainId: currentChain.id });
  const { data: walletClient } = useWalletClient({ chainId: currentChain.id });

  // Fetch comments and summary when farcasterURI is available
  useEffect(() => {
    if (farcasterURI && farcasterURI.trim().length > 0) {
      // Reset refs when farcasterURI changes
      if (!summaryFetchedRef.current) {
        fetchConversationSummary();
        summaryFetchedRef.current = true;
      }
      if (!commentsFetchedRef.current) {
        fetchComments();
        commentsFetchedRef.current = true;
      }
    }

    // Cleanup function to reset refs when component unmounts or URI changes
    return () => {
      summaryFetchedRef.current = false;
      commentsFetchedRef.current = false;
    };
  }, [farcasterURI]);

  const fetchComments = useCallback(async () => {
    if (!farcasterURI || farcasterURI.trim().length === 0) {
      return;
    }

    setIsLoadingComments(true);
    try {
      const response = await fetch(
        `/api/farcaster/comments?castUrl=${encodeURIComponent(farcasterURI)}`
      );
      const data = await response.json();

      if (data.success && data.comments) {
        // Map Neynar API response to our Cast interface
        const mappedComments: Cast[] = data.comments.map((cast: NeynarCast) => ({
          hash: cast.hash,
          text: cast.text,
          timestamp: cast.timestamp,
          author: {
            fid: cast.author.fid,
            username: cast.author.username,
            display_name: cast.author.display_name,
            pfp_url: cast.author.pfp_url,
          },
          reactions: {
            likes_count: cast.reactions.likes_count,
            recasts_count: cast.reactions.recasts_count,
          },
        }));
        setComments(mappedComments);
      } else {
        console.error("Failed to fetch comments:", data.error);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [farcasterURI]);

  const fetchConversationSummary = useCallback(async () => {
    if (!farcasterURI || farcasterURI.trim().length === 0) {
      return;
    }

    setIsLoadingSummary(true);
    try {
      const response = await fetch(
        `/api/farcaster/conversation-summary?castHash=${encodeURIComponent(farcasterURI)}&eventId=${eventId}`
      );
      const data = await response.json();

      if (data.success && data.summary) {
        setConversationSummary(data.summary);
        if (data.cached) {
          console.log(`[CommentsTab] Using cached summary for event ${eventId}`);
        }
      } else {
        console.error("Failed to fetch conversation summary:", data.error);
      }
    } catch (error) {
      console.error("Error fetching conversation summary:", error);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [farcasterURI, eventId]);

  const handleActivateComments = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const configuredBase = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000/";
    const runtimeOrigin = window.location.origin;
    const baseUrl = (
      configuredBase && configuredBase.length > 0
        ? configuredBase
        : runtimeOrigin
    ).replace(/\/$/, "");
    const eventUrl = `${baseUrl}/event/${eventId}`;
    const castText = `Join me at "${eventTitle}"! 🎉\n\nGet your ticket here: ${eventUrl}`;

    setIsActivating(true);

    try {
      const inMiniApp = await sdk.isInMiniApp();

      if (!inMiniApp) {
        toast.info("Open in Farcaster", {
          description:
            "Post composer is only available inside the Farcaster app.",
        });
        setIsActivating(false);
        return;
      }

      const result = await sdk.actions.composeCast({
        text: castText,
        embeds: [eventUrl],
        channelKey: "base",
      });

      if (result?.cast) {
        const castUrl = result.cast.hash;

        toast.success("Post created!", {
          description: "Updating event with Farcaster post link...",
        });

        // Update the contract with the cast URL
        await updateContractFarcasterURI(castUrl);
      } else {
        toast.info("Post canceled", {
          description: "Cast composer was closed without posting.",
        });
        setIsActivating(false);
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      toast.error("Post failed", {
        description:
          error instanceof Error
            ? error.message
            : "Unexpected error while creating the post.",
      });
      setIsActivating(false);
    }
  }, [eventId, eventTitle]);

  const updateContractFarcasterURI = useCallback(
    async (castUrl: string) => {
      if (!walletClient || !publicClient) {
        toast.error("Wallet not connected", {
          description: "Please connect your wallet to continue.",
        });
        setIsActivating(false);
        return;
      }

      setIsUpdatingContract(true);

      try {
        // Simulate the transaction first
        const { request } = await publicClient.simulateContract({
          account: creatorAddress as `0x${string}`,
          address: EVENT_BOOK_ADDRESS,
          abi: EVENT_BOOK_ABI,
          functionName: "updateFarcasterURI",
          args: [BigInt(eventId), castUrl],
        });

        // Execute the transaction
        const hash = await walletClient.writeContract(request);

        toast.info("Transaction submitted", {
          description: "Waiting for confirmation...",
        });

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status !== "success") {
          throw new Error("Transaction failed or reverted.");
        }

        toast.success("Comments activated!", {
          description: "Your event now has a discussion thread on Farcaster.",
        });

        // Invalidate the conversation summary cache
        await fetch(`/api/farcaster/conversation-summary/invalidate?eventId=${eventId}`, {
          method: "POST",
        }).catch((err) => console.error("Failed to invalidate cache:", err));

        // Update the parent component
        onFarcasterURIUpdate(castUrl);
      } catch (error) {
        console.error("Failed to update Farcaster URI:", error);
        toast.error("Update failed", {
          description:
            error instanceof Error
              ? error.message
              : "Failed to update event with Farcaster post.",
        });
      } finally {
        setIsActivating(false);
        setIsUpdatingContract(false);
      }
    },
    [walletClient, publicClient, creatorAddress, eventId, onFarcasterURIUpdate]
  );

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // No farcasterURI and user is owner - show activation button
  if (isEventOwner && (!farcasterURI || farcasterURI.trim().length === 0)) {
    return (
      <div className="mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
          Event Comments
        </h2>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
              <MegaphoneSimple size={32} className="text-purple-300" weight="fill" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white/90 mb-2">
            Activate Event Discussion
          </h3>
          <p className="text-white/60 mb-6 max-w-md mx-auto">
            Post about your event on Farcaster to enable comments and engage with attendees.
          </p>
          <button
            type="button"
            onClick={handleActivateComments}
            disabled={isActivating || isUpdatingContract}
            className="bg-purple-500/20 hover:bg-purple-500/30 active:bg-purple-500/40 text-purple-200 font-semibold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-3 mx-auto disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isActivating || isUpdatingContract ? (
              <>
                <span className="w-5 h-5 border-2 border-purple-200/30 border-t-transparent rounded-full animate-spin" />
                <span>{isUpdatingContract ? "Updating..." : "Creating Post..."}</span>
              </>
            ) : (
              <>
                <MegaphoneSimple size={24} weight="fill" />
                <span>Post About Event</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // No farcasterURI and user is not owner
  if (!farcasterURI || farcasterURI.trim().length === 0) {
    return (
      <div className="mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-4 sm:mb-5">
          Event Comments
        </h2>
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <ChatCircle size={32} className="text-white/40" weight="fill" />
            </div>
          </div>
          <p className="text-white/50">
            The event host hasn&apos;t activated comments yet.
          </p>
        </div>
      </div>
    );
  }

  // Has farcasterURI - show comments
  return (
    <div className="mb-8 sm:mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h2 className="text-xl sm:text-2xl font-semibold text-white/90">
          Event Comments
        </h2>
        <button
          type="button"
          onClick={async () => {
            try {
              const inMiniApp = await sdk.isInMiniApp();
              if (inMiniApp) {
                await sdk.actions.viewCast({ hash: farcasterURI });
              } else {
                window.open(`https://warpcast.com/~/conversations/${farcasterURI}`, '_blank');
              }
            } catch (error) {
              console.error("Failed to view cast:", error);
              window.open(`https://warpcast.com/~/conversations/${farcasterURI}`, '_blank');
            }
          }}
          className="inline-flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-medium py-2.5 px-4 rounded-lg transition-all"
        >
          <PencilSimple size={18} weight="bold" />
          <span>Add a comment</span>
        </button>
      </div>

      {/* Conversation Summary */}
      {isLoadingSummary ? (
        <div className="mb-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-5 border border-purple-400/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkle size={18} className="text-purple-300 animate-pulse" weight="fill" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Conversation Summary
              </h3>
              <div className="space-y-2">
                <div className="h-3 bg-white/10 rounded animate-pulse w-full"></div>
                <div className="h-3 bg-white/10 rounded animate-pulse w-5/6"></div>
                <div className="h-3 bg-white/10 rounded animate-pulse w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      ) : conversationSummary ? (
        <div className="mb-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-5 border border-purple-400/20">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkle size={18} className="text-purple-300" weight="fill" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white/90 mb-2">
                Conversation Summary
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                {conversationSummary.text}
              </p>
            </div>
          </div>
          {conversationSummary.participants.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
              <span className="text-xs text-white/50">Participants:</span>
              <div className="flex -space-x-2">
                {conversationSummary.participants.slice(0, 5).map((participant) => (
                  participant.pfp_url ? (
                    <img
                      key={participant.fid}
                      src={participant.pfp_url}
                      alt={participant.display_name}
                      className="w-6 h-6 rounded-full border-2 border-purple-500/30 object-cover"
                      title={participant.display_name}
                    />
                  ) : (
                    <div
                      key={participant.fid}
                      className="w-6 h-6 rounded-full bg-white/10 border-2 border-purple-500/30 flex items-center justify-center"
                      title={participant.display_name}
                    >
                      <User size={12} className="text-white/50" weight="fill" />
                    </div>
                  )
                ))}
                {conversationSummary.participants.length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-purple-500/30 flex items-center justify-center">
                    <span className="text-[10px] text-white/60 font-medium">
                      +{conversationSummary.participants.length - 5}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-4">
        {isLoadingComments && comments.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10">
            <div className="w-8 h-8 border-2 border-white/20 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10">
            <ChatCircle size={48} className="text-white/30 mx-auto mb-3" weight="fill" />
            <p className="text-white/50">
              No comments yet. Be the first to comment!
            </p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <div
                key={comment.hash}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/10 hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-start gap-3">
                  {comment.author.pfp_url ? (
                    <img
                      src={comment.author.pfp_url}
                      alt={comment.author.display_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <User size={20} className="text-white/50" weight="fill" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-white/90">
                        {comment.author.display_name}
                      </span>
                      <span className="text-sm text-white/40">
                        @{comment.author.username}
                      </span>
                      <span className="text-sm text-white/30">
                        · {formatTimeAgo(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-white/70 leading-relaxed whitespace-pre-wrap break-words">
                      {comment.text}
                    </p>
                    {comment.reactions && (
                      <div className="flex items-center gap-4 mt-3 text-sm text-white/50">
                        <span className="flex items-center gap-1.5">
                          <Heart size={16} weight="fill" className="text-red-400/70" />
                          {comment.reactions.likes_count}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ArrowsClockwise size={16} weight="bold" className="text-green-400/70" />
                          {comment.reactions.recasts_count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
