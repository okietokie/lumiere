import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MoveRight, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { COLORS } from "@/utils/colors";

const titles = [
  "Where space becomes art",
  "Design beyond imagination",
  "Craft your perfect interior",
  "Turn ideas into reality",
  "Experience design differently",
  "Your space, your story",
  "Make every corner yours"
];

const ScrollExpandMedia = ({
  mediaType = 'image',
  mediaSrc,
  bgImageSrc,
  textBlend = true,
  children,
}) => {
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isMobileState, setIsMobileState] = useState(false);

  const [titleNumber, setTitleNumber] = useState(0);

  const sectionRef = useRef(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber]);

  useEffect(() => {
    setScrollProgress(0);
    setShowContent(false);
    setMediaFullyExpanded(false);
  }, [mediaType]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (mediaFullyExpanded && e.deltaY < 0 && window.scrollY <= 5) {
        setMediaFullyExpanded(false);
        e.preventDefault();
      } else if (!mediaFullyExpanded) {
        e.preventDefault();
        const scrollDelta = e.deltaY * 0.0009;
        const newProgress = Math.min(
          Math.max(scrollProgress + scrollDelta, 0),
          1
        );
        setScrollProgress(newProgress);

        if (newProgress >= 1) {
          setMediaFullyExpanded(true);
          setShowContent(true);
        } else if (newProgress < 0.75) {
          setShowContent(false);
        }
      }
    };

    const handleTouchStart = (e) => {
      setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
      if (!touchStartY) return;

      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;

      if (mediaFullyExpanded && deltaY < -20 && window.scrollY <= 5) {
        setMediaFullyExpanded(false);
        e.preventDefault();
      } else if (!mediaFullyExpanded) {
        e.preventDefault();
        const scrollFactor = deltaY < 0 ? 0.008 : 0.005;
        const scrollDelta = deltaY * scrollFactor;
        const newProgress = Math.min(
          Math.max(scrollProgress + scrollDelta, 0),
          1
        );
        setScrollProgress(newProgress);

        if (newProgress >= 1) {
          setMediaFullyExpanded(true);
          setShowContent(true);
        } else if (newProgress < 0.75) {
          setShowContent(false);
        }

        setTouchStartY(touchY);
      }
    };

    const handleTouchEnd = () => {
      setTouchStartY(0);
    };

    const handleScroll = () => {
      if (!mediaFullyExpanded) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollProgress, mediaFullyExpanded, touchStartY]);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobileState(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const mediaWidth = 300 + scrollProgress * (isMobileState ? 650 : 1250);
  const mediaHeight = 400 + scrollProgress * (isMobileState ? 200 : 500);
  const textTranslateX = scrollProgress * (isMobileState ? 180 : 150);

  return (
    <div
      ref={sectionRef}
      className='transition-colors duration-700 ease-in-out overflow-x-hidden w-full'
    >
      <section className='relative flex flex-col items-center justify-start min-h-[100dvh]'>
        <div className='relative w-full flex flex-col items-center min-h-[100dvh]'>
          <motion.div
            className='absolute inset-0 z-0 h-full'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 - scrollProgress }}
            transition={{ duration: 0.1 }}
          >
            <img
              src={bgImageSrc}
              alt='Background'
              className='w-screen h-screen'
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
            <div className='absolute inset-0 bg-black/60' />
          </motion.div>

          <div className='w-full flex flex-col items-center justify-start relative z-10'>
            <div className='flex flex-col items-center justify-center w-full h-[100dvh] relative'>

              <div
                className='absolute z-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-none rounded-2xl'
                style={{
                  width: `${mediaWidth}px`,
                  height: `${mediaHeight}px`,
                  maxWidth: '95vw',
                  maxHeight: '90vh',
                  boxShadow: '0px 0px 50px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div className='relative w-full h-full'>
                  <img
                    src={mediaSrc}
                    alt="Media content"
                    className='w-full h-full object-cover rounded-xl'
                  />
                  <motion.div
                    className='absolute inset-0 bg-black/50 rounded-xl'
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0.5 - scrollProgress * 0.4 }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>

              {/* Central Text Animations */}
              <div
                className="flex items-center justify-center text-center gap-4 md:gap-8 w-full relative z-10 transition-none flex-col"
                style={{ pointerEvents: scrollProgress > 0.5 ? 'none' : 'auto' }}
              >
                <motion.div
                  className={`flex flex-col items-center justify-center gap-8 w-full max-w-4xl mx-auto ${textBlend ? 'mix-blend-lighten' : 'mix-blend-normal'}`}
                  style={{ transform: `translateX(-${textTranslateX}vw)` }}
                >
                  <h1
                    className='w-full max-w-[calc(100vw-2rem)] px-4 text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-bold tracking-normal sm:tracking-tight transition-none leading-[1.08] break-words'
                    style={{ color: COLORS.action }}
                  >
                    Lumiere Maison
                  </h1>
                </motion.div>

                <motion.div
                  className='flex flex-col items-center gap-6 mt-4 w-full h-32'
                  style={{ transform: `translateX(${textTranslateX}vw)` }}
                >
                  <div className={`relative flex w-full justify-center items-center text-center overflow-hidden h-20 px-4 ${textBlend ? 'mix-blend-lighten' : 'mix-blend-normal'}`}>
                    {titles.map((title, index) => (
                      <motion.h2
                        key={index}
                        className="absolute w-full max-w-[calc(100vw-2rem)] px-4 text-lg sm:text-2xl md:text-4xl lg:text-5xl font-medium tracking-normal leading-tight"
                        style={{ color: COLORS.text }}
                        initial={{ opacity: 0, y: 50 }}
                        transition={{ type: "spring", stiffness: 50 }}
                        animate={
                          titleNumber === index
                            ? { y: 0, opacity: 1 }
                            : { y: titleNumber > index ? -50 : 50, opacity: 0 }
                        }
                      >
                        {title}
                      </motion.h2>
                    ))}
                  </div>

                  <div className="flex flex-row items-center gap-6 mt-6">
                    {/* Start Designing Button */}
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      className="group relative flex items-center justify-center w-[150px] h-[48px] sm:w-[50px] sm:h-[50px] sm:hover:w-[180px] rounded-lg sm:rounded-full overflow-hidden transition-all duration-300 cursor-pointer font-semibold border-none"
                      style={{
                        backgroundColor: COLORS.action,
                        color: COLORS.background,
                        boxShadow: `0 0 20px ${COLORS.action}4d`,
                      }}
                    >
                      <div className="absolute inset-0 hidden sm:flex items-center justify-center transition-all duration-300 group-hover:translate-y-[30px] group-hover:opacity-0">
                        <MoveRight className="w-5 h-5" />
                      </div>
                      <span
                        className="static text-sm sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-[-20px] sm:opacity-0 transition-all duration-300 sm:group-hover:top-1/2 sm:group-hover:-translate-y-1/2 sm:group-hover:opacity-100 whitespace-nowrap sm:text-lg"
                        style={{ color: COLORS.background }}
                      >
                        Start Designing
                      </span>
                    </button>

                    {/* Watch Demo Button */}
                    <button
                      type="button"
                      onClick={() => navigate("/user/room")}
                      className="group relative flex items-center justify-center w-[132px] h-[48px] sm:w-[50px] sm:h-[50px] sm:hover:w-[160px] rounded-lg sm:rounded-full bg-transparent overflow-hidden backdrop-blur-md transition-all duration-300 cursor-pointer font-semibold"
                      style={{
                        color: COLORS.text,
                        border: `2px solid ${COLORS.action}66`,
                      }}
                    >
                      <div className="absolute inset-0 hidden sm:flex items-center justify-center transition-all duration-300 group-hover:translate-y-[30px] group-hover:opacity-0">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                      <span
                        className="static text-sm sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-[-20px] sm:opacity-0 transition-all duration-300 sm:group-hover:top-1/2 sm:group-hover:-translate-y-1/2 sm:group-hover:opacity-100 whitespace-nowrap sm:text-lg"
                        style={{ color: COLORS.action }}
                      >
                        Watch Demo
                      </span>
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>

            <motion.section
              className='flex flex-col w-full'
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 100 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="w-full min-h-screen pt-20" style={{ backgroundColor: COLORS.background }}>
                {children}
              </div>
            </motion.section>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ScrollExpandMedia;
