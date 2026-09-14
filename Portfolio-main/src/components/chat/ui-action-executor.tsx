'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function UiActionExecutor({ action }: { action: string }) {
  const [showFixButton, setShowFixButton] = useState(false);
  const [showScriptKiddie, setShowScriptKiddie] = useState(false);

  useEffect(() => {
    switch (action) {
      case 'sudo_rm_rf':
        // Screen shake
        document.body.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
        setTimeout(() => {
          document.body.style.animation = '';
        }, 500);
        // Cascading red errors
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            toast.error('Permission Denied: Root access required.', {
              duration: 2000,
              style: { background: 'red', color: 'white', border: 'none' },
            });
          }, i * 100);
        }
        break;

      case 'tabs_vs_spaces':
        // Misalign text margins globally
        document.body.classList.add('misaligned-text');
        setShowFixButton(true);
        break;

      case 'console_log':
        // Spam console
        for (let i = 0; i < 50; i++) {
          console.log(`here ${i + 1}`);
        }
        toast('Check your developer tools console 👀');
        break;

      case 'deploy_on_friday':
        // Nightmare mode
        document.body.classList.add('nightmare-mode');
        // We'll use a modal-like toast for the warning
        toast('🚨 WARNING: READ-ONLY FRIDAY ENFORCED 🚨', {
          duration: 5000,
          style: { background: 'darkred', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', padding: '1rem' },
        });
        setTimeout(() => {
          document.body.classList.remove('nightmare-mode');
        }, 5000);
        break;

      case 'prompt_injection':
        // Script kiddie modal
        setShowScriptKiddie(true);
        setTimeout(() => {
          setShowScriptKiddie(false);
        }, 4000);
        break;
    }

    return () => {
      // Cleanup if unmounted
      if (action === 'sudo_rm_rf') document.body.style.animation = '';
    };
  }, [action]);

  const fixFormatting = () => {
    document.body.classList.remove('misaligned-text');
    setShowFixButton(false);
    toast.success('Formatting restored. Spaces reign supreme.');
  };

  return (
    <div className="w-full rounded-lg bg-secondary/10 p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">System execution: </span>
        <code className="rounded bg-background px-2 py-1 text-xs text-primary">{action}</code>
      </div>

      {showFixButton && (
        <button
          onClick={fixFormatting}
          className="mt-4 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
        >
          Fix Formatting
        </button>
      )}

      <AnimatePresence>
        {showScriptKiddie && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border-2 border-yellow-500 bg-background px-6 py-4 shadow-xl"
          >
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">
                Achievement Unlocked
              </p>
              <p className="text-lg font-semibold text-foreground">The Script Kiddie</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Required CSS for animations injected dynamically for the Easter eggs */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .misaligned-text p, .misaligned-text h1, .misaligned-text h2, .misaligned-text h3 {
          margin-left: ${Math.random() * 20 + 10}px !important;
          transition: margin 0.3s ease;
        }
        .nightmare-mode {
          background-color: #3b0000 !important;
          color: #ffcccc !important;
          transition: background-color 0.5s ease;
        }
        .nightmare-mode * {
          border-color: #ff0000 !important;
        }
      `}} />
    </div>
  );
}
