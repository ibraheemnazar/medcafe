"use client";
import React, { useState } from 'react';
import { MapPin, Instagram, Utensils, Clock, Coffee, ChevronRight, ExternalLink, X, Download, Star, MessageSquare, Send, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [logoError, setLogoError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Rating State
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Mock Data
  const cafeDetails = {
    logo: "med.jpg",
    name: "Med Cafe",
    tagline: "Coffee & Food",
    description: "A calm break that helps you refocus and recharge.",
    links: {
      googleMaps: "https://maps.app.goo.gl/cNGPNxG21ZAd51iH9",
      instagram: "https://www.instagram.com/medcafe.iq/",
      // Optional: Keep the PDF link if you still have the file in the public folder
      pdfDownload: "/menu.pdf",
      phone: "tel:+9647760202032"
    },
    
    // 👇 UPDATE THIS SECTION
    // 1. Put your screenshots in the 'public' folder.
    // 2. Rename them to menu-1.png, menu-2.png, etc.
    // 3. Add them to this list:
    menuImages: [
      "/menu-1.png", 
      "/menu-2.png",
      "/menu-3.png",
      "/menu-4.png",
      "/menu-5.png",
      "/menu-6.png",
      "/menu-7.png",
      "/menu-8.png",
      "/menu-9.png"
    ],
    
    hours: "Open Daily: 8am - 1am"
  };

  const handleSubmitRating = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    // Here you would typically send the data to a backend
    // For now, we simulate a successful submission
    setTimeout(() => {
        setIsSubmitted(true);
    }, 500);
  };

  const resetRating = () => {
    setIsRatingOpen(false);
    setTimeout(() => {
        setIsSubmitted(false);
        setRating(0);
        setFeedback("");
    }, 300);
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    show: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 60, damping: 15 }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FDFBF7] text-[#2C2420] font-sans selection:bg-[#D4A373] selection:text-white overflow-hidden relative">
      
      {/* Ambient Background Motion */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -right-20 w-96 h-96 bg-[#E6D5C3] rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], x: [0, -40, 0], y: [0, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 1 }}
          className="absolute top-40 -left-20 w-72 h-72 bg-[#D4A373] rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        />
      </div>

      {/* Main Container */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-md mx-auto min-h-[100dvh] flex flex-col px-6 py-8 md:py-12"
      >
        
        {/* Header Section */}
        <header className="flex flex-col items-center text-center space-y-4 mb-8 md:mb-10">
          <div className="w-28 h-28 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-2 ring-4 ring-[#EFEBE9] overflow-hidden relative">
            {!logoError ? (
              <img 
                src={cafeDetails.logo} 
                alt={`${cafeDetails.name} Logo`} 
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
               <div className="flex flex-col items-center justify-center text-[#3E2723] h-full w-full bg-[#EFEBE9]">
                 <Coffee size={40} strokeWidth={1.5} />
               </div>
            )}
          </div>
          
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-serif font-bold text-[#3E2723] tracking-wide">{cafeDetails.name}</h1>
            <p className="text-[#8D6E63] font-medium mt-1 uppercase tracking-widest text-xs">{cafeDetails.tagline}</p>
          </motion.div>

          <motion.p variants={itemVariants} className="text-sm text-[#5D4037] max-w-xs leading-relaxed opacity-80">
            {cafeDetails.description}
          </motion.p>
        </header>

        {/* Links Section */}
        <motion.main className="flex-1 flex flex-col justify-center space-y-4 w-full">
          
          <LinkButton 
            onClick={() => setIsMenuOpen(true)}
            icon={<Utensils size={20} />}
            label="View Our Menu"
            subLabel="Seasonal Brews & Bites"
            variants={itemVariants} href={undefined} primary={undefined} download={undefined}          />

          <LinkButton 
            href={cafeDetails.links.instagram}
            icon={<Instagram size={20} />}
            label="Instagram"
            subLabel="@medcafe.iq"
            variants={itemVariants} onClick={undefined} primary={undefined} download={undefined}          />

          <LinkButton 
            href={cafeDetails.links.googleMaps}
            icon={<MapPin size={20} />}
            label="Find Location"
            subLabel="Get Directions via Google Maps"
            variants={itemVariants} onClick={undefined} primary={undefined} download={undefined}          />

          <LinkButton 
            onClick={() => setIsRatingOpen(true)}
            icon={<MessageSquare size={20} />}
            label="Rate Your Experience"
            subLabel="We value your feedback"
            variants={itemVariants} href={undefined} primary={undefined} download={undefined}          />

          <LinkButton 
            href={cafeDetails.links.phone}
            icon={<Phone size={20} />}
            label="Call Us"
            subLabel="+964 776 020 2032"
            variants={itemVariants} onClick={undefined} primary={undefined} download={undefined}          />

        </motion.main>

        <motion.footer variants={itemVariants} className="mt-12 pb-4">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-[#EFEBE9] text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-[#5D4037] mb-2">
              <Clock size={16} />
              <span className="text-sm font-semibold tracking-wide">Business Hours</span>
            </div>
            <p className="text-[#3E2723] text-lg font-serif">{cafeDetails.hours}</p>
          </motion.div>
          
          <div className="mt-8 text-center flex flex-col items-center gap-1.5">
            <p className="text-xs text-[#8D6E63]/60 font-medium">© 2026 {cafeDetails.name}</p>
            <p className="text-[10px] text-[#8D6E63]/40 font-medium tracking-widest uppercase">
              Designed by <a href="https://90codelab.com" target="_blank" rel="noopener noreferrer" className="font-bold text-[#8D6E63]/60 hover:text-[#D4A373] transition-colors cursor-pointer">90codelab</a>
            </p>
          </div>
        </motion.footer>

      </motion.div>

      {/* RATING MODAL */}
      <AnimatePresence>
        {isRatingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#3E2723]/60 backdrop-blur-sm"
              onClick={resetRating}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#FDFBF7] rounded-2xl shadow-2xl p-6 ring-1 ring-[#EFEBE9] overflow-hidden"
            >
               <button 
                 onClick={resetRating}
                 className="absolute top-4 right-4 p-1 hover:bg-[#EFEBE9] rounded-full text-[#8D6E63] transition-colors"
               >
                 <X size={20} />
               </button>

               {!isSubmitted ? (
                 <form onSubmit={handleSubmitRating} className="flex flex-col items-center text-center space-y-6 pt-2">
                   <div>
                       <h2 className="text-xl font-serif font-bold text-[#3E2723]">How was your visit?</h2>
                       <p className="text-sm text-[#8D6E63] mt-1">Tap a star to rate</p>
                   </div>

                   {/* Star Rating */}
                   <div className="flex gap-2">
                       {[1, 2, 3, 4, 5].map((star) => (
                           <button
                               key={star}
                               type="button"
                               onMouseEnter={() => setHoverRating(star)}
                               onMouseLeave={() => setHoverRating(0)}
                               onClick={() => setRating(star)}
                               className="focus:outline-none transition-transform hover:scale-110"
                           >
                               <Star 
                                   size={32} 
                                   className={`${
                                       star <= (hoverRating || rating) 
                                       ? "fill-[#D4A373] text-[#D4A373]" 
                                       : "fill-transparent text-[#EFEBE9] stroke-[1.5px]"
                                   } transition-colors duration-200`}
                               />
                           </button>
                       ))}
                   </div>

                   {/* Feedback Text Area */}
                   <div className="w-full">
                       <textarea
                           value={feedback}
                           onChange={(e) => setFeedback(e.target.value)}
                           placeholder="Tell us about your experience..."
                           className="w-full h-24 p-3 rounded-xl bg-white border border-[#EFEBE9] text-[#3E2723] placeholder:text-[#D7CCC8] focus:outline-none focus:border-[#D4A373] resize-none text-sm transition-all"
                       />
                   </div>

                   <button 
                       type="submit"
                       disabled={rating === 0}
                       className={`
                           w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                           ${rating > 0 
                               ? "bg-[#3E2723] text-white shadow-lg hover:bg-[#5D4037] transform hover:scale-[1.02]" 
                               : "bg-[#EFEBE9] text-[#D7CCC8] cursor-not-allowed"
                           }
                       `}
                   >
                       <span>Submit Review</span>
                       <Send size={16} />
                   </button>
                 </form>
               ) : (
                 <div className="py-8 flex flex-col items-center text-center space-y-4">
                   <motion.div 
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       className="w-16 h-16 bg-[#EFEBE9] rounded-full flex items-center justify-center text-[#D4A373] mb-2"
                   >
                       <Star size={32} className="fill-[#D4A373]" />
                   </motion.div>
                   <div>
                       <h2 className="text-xl font-serif font-bold text-[#3E2723]">Thank You!</h2>
                       <p className="text-[#8D6E63] text-sm mt-1 max-w-200 mx-auto">Your feedback helps us brew better coffee.</p>
                   </div>
                   <button 
                       onClick={resetRating}
                       className="mt-4 text-[#D4A373] text-sm font-semibold hover:underline"
                   >
                       Close
                   </button>
                 </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMAGE GALLERY MODAL */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#3E2723]/60 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full h-[85vh] max-w-4xl bg-[#FDFBF7] rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-[#EFEBE9]"
            >
              
              {/* Modal Header */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-[#EFEBE9] bg-white/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-2 text-[#3E2723]">
                  <Utensils size={18} />
                  <h2 className="font-bold text-lg font-serif">Our Menu</h2>
                </div>
                <div className="flex items-center gap-2">
                   {/* Optional: Button to download the full PDF if it exists */}
                   {cafeDetails.links.pdfDownload && (
                     <a 
                      href={cafeDetails.links.pdfDownload} 
                      download
                      className="hidden sm:flex items-center gap-1 text-xs text-[#8D6E63] hover:text-[#3E2723] mr-2 transition-colors px-3 py-1.5 rounded-full border border-[#EFEBE9] hover:border-[#D4A373]"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">PDF</span>
                    </a>
                   )}
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 hover:bg-[#F5F5F4] rounded-full text-[#5D4037] transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* IMAGE SCROLLER */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-[#EFEBE9] scroll-smooth">
                <div className="flex flex-col gap-2 sm:gap-4 items-center">
                   {cafeDetails.menuImages && cafeDetails.menuImages.length > 0 ? (
                      cafeDetails.menuImages.map((imgSrc, index) => (
                        <div key={index} className="w-full max-w-2xl bg-white p-1 sm:p-2 rounded-lg shadow-md">
                          <img 
                            src={imgSrc} 
                            alt={`Menu Page ${index + 1}`}
                            className="w-full h-auto rounded"
                            loading="lazy" 
                          />
                        </div>
                      ))
                   ) : (
                      <div className="text-center py-20 text-[#8D6E63]">
                         <p>No menu images found.</p>
                         <p className="text-sm mt-2">Please upload menu-1.png, menu-2.png etc.</p>
                      </div>
                   )}
                   
                   <div className="pb-8 pt-4 text-center">
                     <p className="text-xs text-[#8D6E63]">End of Menu</p>
                   </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Reusable Motion Button Component
interface LinkButtonProps {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  primary?: boolean;
  variants?: any;
  download?: boolean | string;
}

const LinkButton = ({ href, onClick, icon, label, subLabel, primary, variants, download }: LinkButtonProps) => {
  const isLink = !!href;
  const Component = isLink ? motion.a : motion.button;
  const specificProps = isLink 
    ? { href, target: "_blank", rel: "noopener noreferrer", ...(download && { download }) } 
    : { onClick, type: "button" as const };

  return (
    <Component 
      {...specificProps}
      variants={variants}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative w-full flex items-center justify-between p-4 rounded-xl 
        border cursor-pointer select-none text-left
        ${primary 
          ? 'bg-[#3E2723] border-[#3E2723] text-[#FDFBF7] shadow-lg shadow-[#3E2723]/20' 
          : 'bg-white border-[#EFEBE9] text-[#3E2723] shadow-sm hover:border-[#D4A373] hover:shadow-md'
        }
      `}
    >
      <div className="flex items-center gap-4">
        <motion.div 
          className={`
            p-2.5 rounded-full transition-colors duration-300
            ${primary ? 'bg-[#5D4037] text-[#D4A373]' : 'bg-[#F5F5F4] text-[#5D4037] group-hover:bg-[#EFEBE9]'}
          `}
          whileHover={{ rotate: [0, -10, 10, 0] }}
        >
          {icon}
        </motion.div>
        <div>
          <p className="font-bold text-sm sm:text-base leading-tight">{label}</p>
          <p className={`text-xs mt-0.5 ${primary ? 'text-[#D7CCC8]' : 'text-[#8D6E63]'}`}>{subLabel}</p>
        </div>
      </div>
      
      <motion.div 
        className={`${primary ? 'text-[#D4A373]' : 'text-[#D4A373]'}`}
        initial={{ x: 0 }}
        whileHover={{ x: 5 }}
      >
        {primary ? <ChevronRight size={20} /> : <ExternalLink size={18} />}
      </motion.div>
    </Component>
  );
};

export default App;