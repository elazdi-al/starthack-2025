"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, CalendarBlank } from "phosphor-react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { EVENT_BOOK_ADDRESS, EVENT_BOOK_ABI } from "@/lib/contracts/eventBook";
import { parseEther } from "viem";
import { toast } from "sonner";
import { format } from "date-fns";

interface CreateEventDialogProps {
  onEventCreated?: () => void;
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [date, setDate] = useState<Date>();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    time: "",
    price: "",
    maxCapacity: "",
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate required fields
      if (!formData.name || !formData.location || !date || !formData.time || !formData.price) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Combine date and time into Unix timestamp
      const [hours, minutes] = formData.time.split(':');
      const eventDateTime = new Date(date);
      eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const dateTimestamp = Math.floor(eventDateTime.getTime() / 1000);

      // Validate future date
      if (dateTimestamp <= Math.floor(Date.now() / 1000)) {
        toast.error("Event date must be in the future");
        return;
      }

      // Convert price to wei
      const priceInWei = parseEther(formData.price);

      // Parse max capacity (0 means unlimited)
      const maxCapacity = formData.maxCapacity ? BigInt(formData.maxCapacity) : BigInt(0);

      // Call smart contract
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
        ],
      });

      toast.success("Creating event...", {
        description: "Transaction submitted. Please wait for confirmation.",
      });
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }
  };

  // Handle successful transaction
  if (isConfirmed && hash) {
    toast.success("Event created successfully!", {
      description: "Your event is now live on the blockchain.",
    });

    // Reset form and close dialog
    setFormData({
      name: "",
      description: "",
      location: "",
      time: "",
      price: "",
      maxCapacity: "",
    });
    setDate(undefined);
    setIsPrivate(false);
    setOpen(false);

    // Callback to refresh events list
    if (onEventCreated) {
      onEventCreated();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Desktop button */}
        <button
          className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 md:flex hidden"
          type="button"
        >
          <Plus size={20} weight="regular" />
          <span className="text-sm">Create Event</span>
        </button>
      </DialogTrigger>
      <DialogTrigger asChild>
        {/* Mobile button */}
        <button
          className="md:hidden text-white/40 hover:text-white/80 active:text-white/90 active:scale-95 transition-all flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-white/5"
          type="button"
        >
          <Plus size={24} weight="regular" />
          <span className="text-[11px] font-semibold whitespace-nowrap">Create</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white/5 border-white/10 text-white backdrop-blur-xl">
        <DialogHeader className="text-left space-y-3">
          <DialogTitle className="text-3xl md:text-4xl font-bold text-white">Create New Event</DialogTitle>
          <DialogDescription className="text-base text-white/60">
            Fill in the details below to create a new event on the blockchain.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 py-2 md:py-4">
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
            <Label htmlFor="name" className="text-white/90">
              Event Name <span className="text-red-400/80">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Web3 Developer Meetup"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/90">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Tell attendees what your event is about..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 min-h-[100px] focus:border-white/20 focus:bg-white/10"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-white/90">
              Location <span className="text-red-400/80">*</span>
            </Label>
            <Input
              id="location"
              placeholder="e.g., San Francisco, CA"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10"
              required
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/90">
                Date <span className="text-red-400/80">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full bg-white/5 backdrop-blur-sm border border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10 rounded-md px-3 py-2 text-left flex items-center justify-between hover:bg-white/10 transition-colors"
                  >
                    <span className={date ? "text-white" : "text-white/40"}>
                      {date ? format(date, "PPP") : "Pick a date"}
                    </span>
                    <CalendarBlank size={16} className="text-white/60" />
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
              <Label htmlFor="time" className="text-white/90">
                Time <span className="text-red-400/80">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10"
                required
              />
            </div>
          </div>

          {/* Price and Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-white/90">
                Ticket Price (ETH) <span className="text-red-400/80">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxCapacity" className="text-white/90">
                Max Capacity
              </Label>
              <Input
                id="maxCapacity"
                type="number"
                min="0"
                placeholder="0 = unlimited"
                value={formData.maxCapacity}
                onChange={(e) => handleInputChange("maxCapacity", e.target.value)}
                className="bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:bg-white/10"
              />
              <p className="text-xs text-white/40">Leave empty or 0 for unlimited</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 border border-white/10 transition-colors backdrop-blur-sm font-semibold text-base"
              disabled={isPending || isConfirming}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-white/90 hover:bg-white text-black font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || isConfirming}
            >
              {isPending || isConfirming ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
