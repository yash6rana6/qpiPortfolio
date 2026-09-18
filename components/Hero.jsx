"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STOCK_VIDEO_SOURCES = [
  "https://videos.pexels.com/video-files/12525562/12525562-uhd_2560_1440_60fps.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
];
const VIDEO_POSTER_URL =
  "https://images.pexels.com/videos/12525562/pexels-photo-12525562.jpeg?auto=compress&cs=tinysrgb&w=1600";
const FRAME_IMAGE_URL =
  "https://images.pexels.com/videos/12525522/pexels-photo-12525522.jpeg?auto=compress&cs=tinysrgb&w=1600";

const FULL_DESCRIPTION =
  "is the professional identity & event management layer for organizers, venues, and artists—powering public presences and seamless booking destinations worldwide.";

export default function Hero() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const frameImageRef = useRef(null);
  const videoWrapRef = useRef(null);
  const videoRef = useRef(null);
  const detailsCardRef = useRef(null);
  const typingIntervalRef = useRef(null);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);

  // Typing state
  const [typedText, setTypedText] = useState("");
  const [isTypingDone, setIsTypingDone] = useState(false);

  const handleVideoError = () => {
    if (sourceIndex < STOCK_VIDEO_SOURCES.length - 1) {
      setSourceIndex((i) => i + 1);
    } else {
      setVideoFailed(true);
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(titleRef.current, { transformOrigin: "left center" });
      gsap.set(videoWrapRef.current, { transformOrigin: "center center" });
      gsap.set(frameImageRef.current, { opacity: 0, scale: 1.05 });
      gsap.set(detailsCardRef.current, { opacity: 0, y: 30, scale: 0.95 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=150%",
          scrub: 0.6,
          pin: true,
          pinSpacing: true,
        },
      });

      // Title movement
      tl.to(
        titleRef.current,
        {
          scale: 0.85,
          x: "-1vw",
          y: "32vh",
          ease: "none",
        },
        0,
      );

      // Video shrink
      tl.to(
        videoWrapRef.current,
        {
          scale: 0.5,
          borderRadius: "24px",
          ease: "none",
        },
        0,
      );

      // Frame image fade in
      tl.to(
        frameImageRef.current,
        {
          opacity: 1,
          scale: 1,
          ease: "power1.out",
        },
        0.3,
      );

      // Glass Card entrance & Typewriter activation
      tl.to(
        detailsCardRef.current,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          ease: "power2.out",
          onStart: () => {
            // The timeline is scrubbed, so onStart fires again every time the
            // user scrolls back over this point — kill the previous interval
            // first or they stack up and never get cleaned.
            clearInterval(typingIntervalRef.current);

            let i = 0;
            setTypedText("");
            setIsTypingDone(false);

            typingIntervalRef.current = setInterval(() => {
              if (i < FULL_DESCRIPTION.length) {
                setTypedText(FULL_DESCRIPTION.slice(0, i + 1));
                i++;
              } else {
                setIsTypingDone(true);
                clearInterval(typingIntervalRef.current);
              }
            }, 25);
          },
        },
        0.6,
      );
    }, sectionRef);

    return () => {
      clearInterval(typingIntervalRef.current);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden bg-obsidian"
    >
      {/* Frame image layer */}
      <div ref={frameImageRef} className="absolute inset-0 z-0">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${FRAME_IMAGE_URL})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/60 via-obsidian/30 to-obsidian" />
      </div>

      {/* Video layer */}
      <div
        ref={videoWrapRef}
        className="absolute inset-0 z-10 overflow-hidden will-change-transform shadow-2xl"
      >
        {!videoFailed ? (
          <video
            ref={videoRef}
            key={STOCK_VIDEO_SOURCES[sourceIndex]}
            className="h-full w-full object-cover opacity-60"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={VIDEO_POSTER_URL}
            onError={handleVideoError}
            src={STOCK_VIDEO_SOURCES[sourceIndex]}
          />
        ) : (
          <div
            className="h-full w-full bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${VIDEO_POSTER_URL})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/40 via-transparent to-obsidian/70 opacity-60" />
      </div>

      {/* Main Content Layer */}
      <div className="relative z-20 flex h-full flex-col items-start justify-center gap-6 px-6 md:flex-row md:items-center md:justify-between md:px-16">
        {/* Main Heading */}
        <h1
          ref={titleRef}
          className="select-none whitespace-nowrap font-display text-[9vw] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] to-[#FF007A] will-change-transform drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]"
          style={{
            filter: "drop-shadow(0 0 20px rgba(0, 242, 254, 0.35))",
          }}
        >
          QPIE Digital
        </h1>

        {/* Glassmorphic Container with Typewriter Animation */}
        <div
          ref={detailsCardRef}
          className="max-w-xl rounded-2xl border border-white/10 bg-obsidian/60 p-6 md:p-8 backdrop-blur-md shadow-2xl transition-all"
        >
          <p className="text-base text-zinc-200 leading-relaxed md:text-xl min-h-[120px]">
            <span className="font-semibold text-[#00F0FF]">QPIE Digital</span>{" "}
            {typedText}
            {/* Blinking Cyan Cursor */}
            <span
              className={`inline-block w-2.5 h-5 ml-1 bg-[#00F0FF] ${
                isTypingDone ? "animate-pulse" : "animate-ping"
              }`}
            />
          </p>
          <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#FF2A85] px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-[0_0_20px_rgba(255,42,133,0.4)] transition-all duration-300 hover:scale-105 hover:bg-[#ff4093] hover:shadow-[0_0_30px_rgba(255,42,133,0.7)] active:scale-95">
            ABOUT US <span>↗</span>
          </button>
        </div>
      </div>
    </section>
  );
}
