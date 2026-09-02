"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "INTELLIGENCE", href: "/intelligence" },
    { label: "SOLUTIONS", href: "/intelligence" },
    { label: "RESEARCH", href: "/reports" },
    { label: "REPORTS", href: "/reports" },
    { label: "PRICING", href: "/pricing" },
    { label: "ABOUT", href: "/about" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-[#F6F4EE] border-b border-black/[0.08]">
      <nav
        style={{
          maxWidth: "1360px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
        className="w-full h-full px-6 flex items-center justify-between"
      >
        {/* Left Section: Brand Identity */}
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Standalone Geometric Orange X Mark (#FF5500) */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 shrink-0"
          >
            <path
              d="M2.5 2.5L13.5 13.5M13.5 2.5L2.5 13.5"
              stroke="#FF5500"
              strokeWidth="2.5"
              strokeLinecap="square"
            />
          </svg>

          {/* Logo Text: 16px, font-extrabold, tracking-tight, uppercase */}
          <span
            style={{
              fontFamily: "var(--font-body), 'Space Grotesk', 'Inter Tight', 'Inter', sans-serif",
            }}
            className="text-[16px] font-extrabold tracking-tight text-[#0A0A0A] uppercase select-none"
          >
            ZAYRON-X
          </span>
        </Link>

        {/* Center Section: Navigation Menu */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="uppercase text-[11.5px] font-semibold tracking-wider text-[#1A1A1A] hover:text-black/70 transition-colors duration-150"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right Section: Utilities & Actions */}
        <div className="hidden md:flex items-center gap-5">
          {/* Search Trigger (15px, stroke 1.25px) */}
          <Link
            href="/search"
            className="p-1 text-[#1A1A1A] hover:text-black/70 transition-colors duration-150 cursor-pointer"
            aria-label="Search"
          >
            <svg
              className="w-[15px] h-[15px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1A1A1A"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7.5" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
          </Link>

          {/* Secondary CTA ("SIGN IN"): text-[11.5px], font-bold */}
          <Link
            href="/login"
            className="uppercase text-[11.5px] font-bold tracking-[0.06em] text-[#0A0A0A] hover:text-black/70 hover:underline transition-colors duration-150"
          >
            SIGN IN
          </Link>

          {/* Primary CTA ("GET STARTED"): px-3.5 py-1.5, rounded-[2px], text-[11px], font-bold */}
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-3.5 py-1.5 bg-[#0A0A0A] text-[#FFFFFF] rounded-[2px] uppercase text-[11px] font-bold tracking-[0.08em] hover:bg-black/85 active:scale-[0.98] transition-all duration-150"
          >
            GET STARTED
          </Link>
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/search"
            className="p-1 text-[#1A1A1A]"
            aria-label="Search"
          >
            <svg
              className="w-[15px] h-[15px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1A1A1A"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7.5" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-[#0A0A0A]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden w-full bg-[#F6F4EE] border-b border-black/[0.08] px-6 py-5 shadow-lg">
          <div className="flex flex-col space-y-4">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="uppercase text-[12px] font-semibold tracking-wider text-[#1A1A1A] hover:text-black/70 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-black/[0.08] flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center uppercase text-[11.5px] font-bold tracking-[0.06em] text-[#0A0A0A] py-1.5"
              >
                SIGN IN
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-3.5 py-2 bg-[#0A0A0A] text-[#FFFFFF] rounded-[2px] uppercase text-[11px] font-bold tracking-[0.08em] hover:bg-black/85"
              >
                GET STARTED
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
