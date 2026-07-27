"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

export function InteractiveTicketStack() {
  const [isHovered, setIsHovered] = useState(false);

  const tickets = [
    {
      id: "salon",
      title: "Art Salon Exhibition",
      date: "Friday, Oct 12 · 7:00 PM",
      serial: "PASS-84726-REG",
      price: "$50.00",
      tag: "REGULAR ADMISSION",
      imageUrl:
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80",
      bgClass:
        "bg-stone-50 dark:bg-[#161514] border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100",
      tagClass: "text-stone-600 dark:text-stone-400 font-bold",
      qrColorClass: "text-stone-900 dark:text-stone-100",
      qrBorderClass:
        "border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-900/50",
      rotActive: -8,
      xActive: -100,
      yActive: 10,
      rotIdle: -4,
      xIdle: -25,
      yIdle: 5,
      zIndex: 10,
    },
    {
      id: "rave",
      title: "Warehouse 09 VIP",
      date: "Saturday, Nov 03 · 11:00 PM",
      serial: "PASS-90422-VIP",
      price: "$75.00",
      tag: "VIP ACCESS PASS",
      imageUrl:
        "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?auto=format&fit=crop&w=400&q=80",
      // Distingished VIP Dark/Gold glass card
      bgClass:
        "bg-stone-950 text-stone-100 border-[#BF8430]/40 dark:border-[#BF8430]/60 shadow-[0_15px_30px_rgba(191,132,48,0.15)]",
      tagClass: "text-[#BF8430] font-black tracking-widest",
      qrColorClass: "text-[#BF8430]",
      qrBorderClass: "border-[#BF8430]/30 bg-stone-900/60",
      rotActive: 0,
      xActive: 0,
      yActive: -20,
      rotIdle: 0,
      xIdle: 0,
      yIdle: 0,
      zIndex: 20,
    },
    {
      id: "dinner",
      title: "Founders Dinner Feast",
      date: "Thursday, Sep 28 · 6:30 PM",
      serial: "PASS-10228-REG",
      price: "$120.00",
      tag: "REGULAR ADMISSION",
      imageUrl:
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80",
      bgClass:
        "bg-amber-50/50 dark:bg-[#181613] border-amber-900/10 dark:border-amber-950/30 text-amber-950 dark:text-amber-100",
      tagClass: "text-amber-700 dark:text-amber-400 font-bold",
      qrColorClass: "text-amber-950 dark:text-amber-100",
      qrBorderClass:
        "border-amber-200/50 dark:border-amber-900/40 bg-amber-100/30 dark:bg-amber-950/20",
      rotActive: 8,
      xActive: 100,
      yActive: 10,
      rotIdle: 4,
      xIdle: 25,
      yIdle: 5,
      zIndex: 10,
    },
  ];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full max-w-105 h-85 flex items-center justify-center cursor-pointer mx-auto"
    >
      {tickets.map((t) => (
        <motion.div
          key={t.id}
          animate={{
            x: isHovered ? t.xActive : t.xIdle,
            y: isHovered ? t.yActive : t.yIdle,
            rotate: isHovered ? t.rotActive : t.rotIdle,
            scale: isHovered ? 1.02 : 1,
          }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          style={{ zIndex: t.zIndex }}
          className={cn(
            "absolute w-58 h-82.5 rounded-3xl border p-4 flex flex-col justify-between shadow-2xl",
            t.bgClass,
          )}
        >
          {/* Small crop image banner */}
          <div className="w-full h-20 rounded-xl overflow-hidden relative bg-stone-900/10">
            <Image
              src={t.imageUrl}
              alt={t.title}
              fill
              sizes="232px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
          </div>

          {/* Core metadata */}
          <div className="space-y-1.5 text-left pt-2">
            <span
              className={cn(
                "font-mono text-[8px] tracking-wider block",
                t.tagClass,
              )}
            >
              {t.tag}
            </span>
            <h4 className="text-xs font-bold leading-tight tracking-tight max-w-35 truncate-2-lines">
              {t.title}
            </h4>
            <div className="flex justify-between items-center text-[8px] opacity-75 font-mono">
              <span>{t.date.split(" · ")[0]}</span>
              <strong className="text-copper">{t.price}</strong>
            </div>
          </div>

          {/* Secure QR Code area with dashed Tear line */}
          <div className="space-y-2.5 pt-2.5 border-t border-dashed border-border/40 text-left">
            <div className="flex justify-between items-center">
              <span className="font-mono text-[8px] opacity-60 tracking-wider">
                {t.serial}
              </span>
              <div className={cn("p-1 rounded-lg border", t.qrBorderClass)}>
                <QrCode className={cn("w-6 h-6", t.qrColorClass)} />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
