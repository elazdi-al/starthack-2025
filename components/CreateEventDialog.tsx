"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, CalendarBlank } from "phosphor-react";
import Image from "next/image";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useConnect, useConnectors, useChainId, useSwitchChain, usePublicClient } from "wagmi";
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from "@/lib/contracts/eventBook";
import { parseEther } from "viem";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuthStore } from "@/lib/store/authStore";
import { base } from "viem/chains";
import { useInvalidateEvents } from "@/lib/hooks/useEvents";

interface CreateEventDialogProps {
  onEventCreated?: () => void;
}

const INITIAL_FORM_STATE = {
  name: "",
  description: "",
  location: "",
  time: "",
  price: "",
  maxCapacity: "",
};

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState(() => ({ ...INITIAL_FORM_STATE }));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUploadData, setImageUploadData] = useState<{ cid: string; url: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const MAX_DESCRIPTION_LENGTH = 250;

  const resetFormState = useCallback(() => {
    setFormData({ ...INITIAL_FORM_STATE });
    setDate(undefined);
    setIsPrivate(false);
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageUploadData(null);
  }, []);

  // Use Base auth store for authentication check
  const { isAuthenticated, isSessionValid } = useAuthStore();
  const { address, isConnected } = useAccount(); // Still need wagmi for transaction signing
  const { connect } = useConnect();
  const connectors = useConnectors();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });
  const { switchChainAsync } = useSwitchChain();
  const _publicClient = usePublicClient();
  const chainId = useChainId();
  const { invalidateAll } = useInvalidateEvents();
  useEffect(() => {
    const switchToBase = async () => {
      if (chainId !== base.id){
        try {
          await switchChainAsync({chainId:base.id})
        } catch {
          console.error("Failed to switch to Base chain")
        }
      }
    };
    switchToBase();
  }, [chainId, switchChainAsync]);

  useEffect(() => {
    if (!imagePreviewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Auto-connect wallet if authenticated but wagmi not connected
  useEffect(() => {
    if (isAuthenticated && !isConnected && connectors.length > 0) {
      // Try to connect with the first available connector (usually injected wallet)
      const injectedConnector = connectors.find(c => c.type === 'injected');
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [isAuthenticated, isConnected, connectors, connect]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(null);
      setImageUploadData(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file", {
        description: "Please select a valid image file (PNG, JPG, GIF).",
      });
      return;
    }

    setImageFile(file);
    setImageUploadData(null);

    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageUploadData(null);
  };

  const uploadImageIfNeeded = useCallback(async () => {
    if (imageUploadData) {
      return imageUploadData;
    }

    if (!imageFile) {
      throw new Error("Please select an event cover image before creating the event.");
    }

    setIsUploadingImage(true);

    try {
      const body = new FormData();
      body.append("file", imageFile);

      const response = await fetch("/api/uploads/pinata", {
        method: "POST",
        body,
      } as never);
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.error ?? "Failed to upload the image to Pinata.");
      }

      const uploaded = result.data as { cid: string; url: string };
      setImageUploadData(uploaded);
      return uploaded;
    } finally {
      setIsUploadingImage(false);
    }
  }, [imageFile, imageUploadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check authentication with Base auth system
    if (!isAuthenticated || !isSessionValid()) {
      toast.error("Not authenticated", {
        description: "Please sign in with Base to create an event",
      });
      return;
    }

    // Check if wallet is connected for transaction signing
    if (!address || !isConnected) {
      toast.error("Wallet not connected", {
        description: "Please ensure your wallet extension (MetaMask, Coinbase Wallet, etc.) is installed and connected",
      });
      return;
    }

    try {
      // Validate required fields
      if (!formData.name || !formData.location || !date || !formData.time || !formData.price) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Combine date and time into Unix timestamp
      const [hours, minutes] = formData.time.split(':');
      const eventDateTime = new Date(date);
      eventDateTime.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0);
      const dateTimestamp = Math.floor(eventDateTime.getTime() / 1000);

      // Validate future date
      if (dateTimestamp <= Math.floor(Date.now() / 1000)) {
        toast.error("Event date must be in the future");
        return;
      }

      // Convert price to wei
      const priceInWei = parseEther(formData.price);

      const uploadedImage = await uploadImageIfNeeded();

      // Parse max capacity (0 means unlimited)
      const maxCapacity = formData.maxCapacity ? BigInt(formData.maxCapacity) : BigInt(0);

      console.log("Creating event with:", {
        name: formData.name,
        location: formData.location,
        date: dateTimestamp,
        price: priceInWei.toString(),
        maxCapacity: maxCapacity.toString(),
        address: EVENT_BOOK_ADDRESS,
        imageCid: uploadedImage.cid,
        imageUrl: uploadedImage.url,
      });

      // Call smart contract with imageURL stored on-chain
      writeContract({
        address: EVENT_BOOK_ADDRESS,
        abi: EVENT_BOOK_ABI,
        functionName: "createEvent",
        args: [
          formData.name,
          formData.location,
          BigInt(dateTimestamp),
          priceInWei,
          maxCapacity,
          uploadedImage.url, // Store the image URL on-chain
        ],
      });

      toast.info("Creating event...", {
        description: "Please confirm the transaction in your wallet",
      });
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }
  };

  const handleCancel = () => {
    if (isPending || isConfirming) {
      return;
    }
    resetFormState();
    setOpen(false);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isPending || isConfirming || isUploadingImage) {
        toast.info("Just a moment", {
          description: "Please wait for the current action to finish.",
        });
        return;
      }
      resetFormState();
    }
    setOpen(nextOpen);
  };

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      console.error("Transaction error:", writeError);
      toast.error("Transaction failed", {
        description: writeError.message || "Failed to submit transaction",
      });
    }
  }, [writeError]);

  // Handle successful transaction
  useEffect(() => {
    if (!isConfirmed || !hash) {
      return;
    }

    toast.success("Event created successfully!", {
      description: "Your event is now live on the blockchain with the image stored on-chain.",
    });

    const finalizeCreation = async () => {
      // Invalidate events cache to fetch the new event with on-chain image
      invalidateAll();

      resetFormState();
      setOpen(false);

      if (onEventCreated) {
        onEventCreated();
      }
    };

    void finalizeCreation();
  }, [hash, isConfirmed, invalidateAll, onEventCreated, resetFormState]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {/* Desktop button */}
        <button
          className="hidden md:flex text-white/40 hover:text-white/80 transition-colors items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
          type="button"
        >
          <Plus size={20} weight="regular" />
          <span className="text-sm tracking-tight">Create Event {chainId}</span>
        
        </button>
      </DialogTrigger>
      <DialogTrigger asChild>
        {/* Mobile button */}
        <button
          className="md:hidden text-white/40 hover:text-white/80 active:text-white/90 active:scale-95 transition-all flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-white/5 focus:outline-none focus:ring-0 focus:border-none"
          type="button"
        >
          <Plus size={24} weight="regular" />
          <span className="text-[11px] font-semibold whitespace-nowrap">Create</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[85vh] bg-white/5 border-white/10 text-white backdrop-blur-xl flex flex-col overflow-hidden">
        <DialogHeader className="text-left space-y-2 flex-shrink-0">
          <DialogTitle className="text-5xl sm:text-6xl md:text-7xl tracking-tighter font-bold text-white/90">Create Event</DialogTitle>
          <DialogDescription className="text-sm tracking-tight text-white/50">
            Fill in the details below to create a new event on the blockchain .{chainId}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="space-y-4 py-2 overflow-y-auto overflow-x-hidden flex-1 pr-1">
          {/* Event Type Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="space-y-0.5">
              <Label htmlFor="event-type" className="text-base font-medium text-white/90">
                Private Event
              </Label>
              <p className="text-sm text-white/50">
                {isPrivate ? "Only invited attendees can join" : "Anyone can purchase tickets"}
              </p>
            </div>
            <Switch
              id="event-type"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/90 text-base">
              Event Name <span className="text-red-400/80">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Web3 Developer Meetup"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10 text-base h-11"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-white/90 text-base">
                Description
              </Label>
              <span className="text-xs text-white/40">
                {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
            <Textarea
              id="description"
              placeholder="Tell attendees what your event is about..."
              value={formData.description}
              onChange={(e) => {
                if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
                  handleInputChange("description", e.target.value);
                }
              }}
              maxLength={MAX_DESCRIPTION_LENGTH}
              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 h-[90px] focus:border-white/20 focus:bg-white/10 resize-none text-base"
            />
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label htmlFor="event-image" className="text-white/90 text-base">
              Event Cover Image <span className="text-red-400/80">*</span>
            </Label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-48 min-h-[160px] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                {imagePreviewUrl ? (
                  <Image
                    src={imagePreviewUrl}
                    alt="Event cover preview"
                    fill
                    unoptimized
                    sizes="(min-width: 640px) 12rem, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                    No image selected
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <Input
                  id="event-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isUploadingImage}
                  className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10 text-sm h-11 file:bg-white/10 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-2 file:mr-4"
                />
                <p className="text-xs text-white/40 break-all">
                  {isUploadingImage
                    ? "Uploading image to IPFS via Pinata..."
                    : imageUploadData
                    ? `Pinned to IPFS • CID: ${imageUploadData.cid}`
                    : "Recommended 1280×720 JPG or PNG. The file will be pinned to IPFS via Pinata."}
                </p>
                {imageUploadData ? (
                  <a
                    href={imageUploadData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-300 hover:text-blue-200 underline underline-offset-4"
                  >
                    View uploaded image
                  </a>
                ) : null}
                {imageFile ? (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={isUploadingImage}
                    className="text-xs text-red-300 hover:text-red-200 underline-offset-4 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove image
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-white/90 text-base">
              Location <span className="text-red-400/80">*</span>
            </Label>
            <Input
              id="location"
              placeholder="e.g., San Francisco, CA"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10 text-base h-11"
              required
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/90 text-base">
                Date <span className="text-red-400/80">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full bg-white/5 backdrop-blur-sm border border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10 rounded-md px-3 h-11 text-left flex items-center justify-between hover:bg-white/10 transition-colors text-base"
                  >
                    <span className={date ? "text-white" : "text-white/40"}>
                      {date ? format(date, "PPP") : "Pick a date"}
                    </span>
                    <CalendarBlank size={18} className="text-white/60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white/5 backdrop-blur-xl border-white/10" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="bg-transparent text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-white/90 text-base">
                Time <span className="text-red-400/80">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10 text-base h-11"
                required
              />
            </div>
          </div>

          {/* Price and Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-white/90 text-base">
                Ticket Price (ETH) <span className="text-red-400/80">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                step="0.0000001"
                min="0"
                placeholder="0.0000001"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10 text-base h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxCapacity" className="text-white/90 text-base">
                Max Capacity
              </Label>
              <Input
                id="maxCapacity"
                type="number"
                min="0"
                placeholder="0 = unlimited"
                value={formData.maxCapacity}
                onChange={(e) => handleInputChange("maxCapacity", e.target.value)}
                className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10 text-base h-11"
              />
              <p className="text-xs text-white/40">Leave empty or 0 for unlimited</p>
            </div>
          </div>
          </div>

          <div className="flex gap-3 pt-4 flex-shrink-0 border-t border-white/10 mt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/70 hover:text-white/90 border border-white/10 transition-all active:scale-[0.98] backdrop-blur-sm font-semibold text-base disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending || isConfirming || isUploadingImage}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3.5 rounded-xl bg-white/90 hover:bg-white active:bg-white/80 text-black font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              disabled={isPending || isConfirming || isUploadingImage}
            >
              {isUploadingImage
                ? "Uploading image..."
                : isPending || isConfirming
                ? "Creating..."
                : "Create Event"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
