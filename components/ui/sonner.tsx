"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5" />,
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "bg-white/10 backdrop-blur-xl border-white/20 text-white shadow-2xl",
          title: "text-white font-semibold",
          description: "text-white/70",
          actionButton: "bg-white/20 text-white hover:bg-white/30",
          cancelButton: "bg-white/10 text-white/70 hover:bg-white/20",
          closeButton: "bg-white/10 text-white/70 hover:bg-white/20 border-white/20",
          success: "bg-green-500/20 border-green-500/30 text-white",
          error: "bg-red-500/20 border-red-500/30 text-white",
          warning: "bg-yellow-500/20 border-yellow-500/30 text-white",
          info: "bg-blue-500/20 border-blue-500/30 text-white",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
