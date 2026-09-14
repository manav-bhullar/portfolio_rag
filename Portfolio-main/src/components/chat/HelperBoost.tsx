import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@radix-ui/react-tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BriefcaseBusiness,
  BriefcaseIcon,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleEllipsis,
  CodeIcon,
  GraduationCapIcon,
  Laugh,
  Layers,
  MailIcon,
  PartyPopper,
  UserRoundSearch,
  UserSearch,
} from 'lucide-react';
import { useState } from 'react';
import { Drawer } from 'vaul';

interface HelperBoostProps {
  submitQuery?: (query: string) => void;
  setInput?: (value: string) => void;
  /** Hide the chip row (e.g. while the on-screen keyboard is up) */
  collapsed?: boolean;
}

const questions = {
  Me: 'Who are you? I want to know more about you.',
  Projects: 'What are your projects? What are you working on right now?',
  Skills: 'What are your skills? Give me a list of your soft and hard skills.',
  Fun: "What the craziest thing you've ever done? What are your hobbies? ",
  Contact:
    'How can I reach you? What kind of project would make you say "yes" immediately?',
};

const questionConfig = [
  { key: 'Me', color: '#191919', icon: Laugh },
  { key: 'Projects', color: '#3E8EDE', icon: BriefcaseBusiness },
  { key: 'Skills', color: '#3FB37F', icon: Layers },
  { key: 'Fun', color: '#F0954A', icon: PartyPopper },
  { key: 'Contact', color: '#8B5FE0', icon: UserRoundSearch },
];

// Helper drawer data
const specialQuestions = [
  'Who are you?',
  'Can I see your resume?',
  'What projects are you most proud of?',
  'What are your skills?',
  'How can I reach you?',
  "What's the craziest thing you've ever done?",
];

const questionsByCategory = [
  {
    id: 'me',
    name: 'Me',
    icon: UserSearch,
    questions: [
      'Who are you?',
      'What are your passions?',
      'How did you get started in tech?',
      'Where do you see yourself in 5 years?',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: BriefcaseIcon,
    questions: [
      'Can I see your resume?',
      'What makes you a valuable team member?',
      'Where are you working now?',
      'Why should I hire you?',
      "What's your educational background?",
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: CodeIcon,
    questions: ['What projects are you most proud of?'],
  },
  {
    id: 'skills',
    name: 'Skills',
    icon: GraduationCapIcon,
    questions: [
      'What are your skills?'
    ],
  },
  {
    id: 'fun',
    name: 'Fun',
    icon: PartyPopper,
    questions: [
      "What's the craziest thing you've ever done?",
      'What are your interests outside of coding?',
    ],
  },
  {
    id: 'contact',
    name: 'Contact & Future',
    icon: MailIcon,
    questions: [
      'How can I reach you?',
      "What kind of project would make you say 'yes' immediately?",
      'Where are you located?',
    ],
  },
];

// Animated Chevron component
const AnimatedChevron = () => {
  return (
    <motion.div
      animate={{
        y: [0, -4, 0], // Subtle up and down motion
      }}
      transition={{
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'loop',
      }}
      className="text-primary mb-1.5"
    >
      <ChevronUp size={16} />
    </motion.div>
  );
};

export default function HelperBoost({
  submitQuery,
  collapsed = false,
}: HelperBoostProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [open, setOpen] = useState(false);

  const handleQuestionClick = (questionKey: string) => {
    if (submitQuery) {
      submitQuery(questions[questionKey as keyof typeof questions]);
    }
  };

  const handleDrawerQuestionClick = (question: string) => {
    if (submitQuery) {
      submitQuery(question);
    }
    setOpen(false);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <div className="w-full">
          {/* Toggle — desktop only. On phones the row is always there (it's the
              primary navigation) and a text toggle would just spend vertical
              space; the keyboard collapses it automatically instead. */}
          <div className="hidden justify-center md:flex">
            <button
              onClick={toggleVisibility}
              aria-expanded={isVisible}
              aria-label={isVisible ? 'Hide quick questions' : 'Show quick questions'}
              className="flex items-center gap-1 px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {isVisible ? (
                <>
                  <ChevronDown size={14} />
                  Hide quick questions
                </>
              ) : (
                <>
                  <ChevronUp size={14} />
                  Show quick questions
                </>
              )}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {isVisible && !collapsed && (
              <motion.div
                key="chips"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full overflow-hidden"
              >
                {/* Edge-to-edge scroller on phones (negative margin cancels the
                    composer's side padding) with faded edges so it reads as
                    swipeable; wraps normally from md up. */}
                <div
                  className="scroll-x fade-x -mx-3 flex flex-nowrap gap-2 px-3 pt-1 pb-2 sm:mx-0 sm:px-0 md:flex-wrap md:justify-center md:gap-3 md:overflow-visible"
                  role="group"
                  aria-label="Quick questions"
                >
                  {questionConfig.map(({ key, color, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleQuestionClick(key)}
                      className="pressable flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary md:h-11"
                    >
                      <Icon size={16} strokeWidth={2.25} color={color} />
                      <span>{key}</span>
                    </button>
                  ))}

                  {/* More questions — opens the bottom sheet */}
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Drawer.Trigger
                          aria-label="More questions"
                          className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary md:h-11 md:w-auto md:px-4"
                        >
                          <CircleEllipsis className="h-5 w-5" strokeWidth={2} />
                        </Drawer.Trigger>
                      </TooltipTrigger>
                      <TooltipContent className="hidden md:block">
                        <AnimatedChevron />
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drawer Content — kept as a bottom sheet (vaul measures/calculates
            its own height for drag & snap points, so we only constrain
            width/centering here rather than overriding height) */}
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-100 bg-black/50 backdrop-blur-xs" />
          <Drawer.Content
            className="fixed right-0 bottom-0 left-0 z-100 mx-auto flex h-[85dvh] max-w-xl flex-col rounded-t-[2rem] bg-card outline-none lg:h-[60dvh]"
            aria-describedby={undefined}
          >
            <div className="flex shrink-0 justify-center pt-3 pb-2">
              <div aria-hidden className="h-1.5 w-10 rounded-full bg-border" />
            </div>
            <div
              className="scroll-y min-h-0 flex-1 px-4"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
            >
              <div className="mx-auto max-w-md space-y-4">
                <div className="mx-auto w-full max-w-md">
                  <div className="space-y-8 pb-4">
                    {questionsByCategory.map((category) => (
                      <CategorySection
                        key={category.id}
                        name={category.name}
                        Icon={category.icon}
                        questions={category.questions}
                        onQuestionClick={handleDrawerQuestionClick}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

// Component for each category section
interface CategorySectionProps {
  name: string;
  Icon: React.ElementType;
  questions: string[];
  onQuestionClick: (question: string) => void;
}

function CategorySection({
  name,
  Icon,
  questions,
  onQuestionClick,
}: CategorySectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 px-1">
        <Icon className="h-5 w-5 text-foreground" />
        <Drawer.Title className="font-display text-[22px] font-bold text-foreground">
          {name}
        </Drawer.Title>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        {questions.map((question, index) => (
          <QuestionItem
            key={index}
            question={question}
            onClick={() => onQuestionClick(question)}
            isSpecial={specialQuestions.includes(question)}
          />
        ))}
      </div>
    </div>
  );
}

// Component for each question item with animated chevron
interface QuestionItemProps {
  question: string;
  onClick: () => void;
  isSpecial: boolean;
}

function QuestionItem({ question, onClick, isSpecial }: QuestionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className={cn(
        'pressable flex w-full min-h-12 items-center justify-between gap-3 rounded-2xl',
        'px-5 py-3.5 text-left text-[15px] font-normal',
        'transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3FB37F]',
        isSpecial ? 'bg-foreground' : 'bg-secondary'
      )}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileTap={{ scale: 0.98 }}
    >
      <span
        className={
          isSpecial ? 'font-semibold text-primary-foreground' : 'text-foreground'
        }
      >
        {question}
      </span>
      <motion.div
        animate={{ x: isHovered ? 4 : 0 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
      >
        <ChevronRight
          className={cn(
            'h-5 w-5 shrink-0',
            isSpecial ? 'text-primary-foreground' : 'text-foreground'
          )}
        />
      </motion.div>
    </motion.button>
  );
}
