import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
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
    questions: ['What are your skills?'],
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

export default function HelperBoost({ submitQuery }: HelperBoostProps) {
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
          {/* Toggle Button */}
          <div
            className={
              isVisible
                ? 'mb-2 flex justify-center'
                : 'mb-0 flex justify-center'
            }
          >
            <button
              onClick={toggleVisibility}
              aria-expanded={isVisible}
              aria-label={
                isVisible ? 'Hide quick questions' : 'Show quick questions'
              }
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-4 py-2 text-xs transition-colors"
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

          {/* HelperBoost Content */}
          {isVisible && (
            <div className="w-full">
              <div
                className="flex w-full [scrollbar-width:none] flex-nowrap gap-2 overflow-x-auto pb-1 md:flex-wrap md:gap-3 md:overflow-x-visible [&::-webkit-scrollbar]:hidden"
                style={{ justifyContent: 'safe center' }}
              >
                {questionConfig.map(({ key, color, icon: Icon }) => (
                  <Button
                    key={key}
                    onClick={() => handleQuestionClick(key)}
                    variant="outline"
                    className="border-border hover:bg-secondary bg-card h-auto min-w-fit flex-shrink-0 cursor-pointer rounded-full border px-3 py-2.5 shadow-none transition-none active:scale-95 sm:px-4 sm:py-3"
                  >
                    <div className="text-foreground flex items-center gap-2">
                      <Icon
                        size={14}
                        className="sm:h-4 sm:w-4"
                        strokeWidth={2.25}
                        color={color}
                      />
                      <span className="text-xs font-semibold sm:text-sm">
                        {key}
                      </span>
                    </div>
                  </Button>
                ))}

                {/* Need Inspiration Button */}
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Drawer.Trigger asChild aria-label="More quick questions">
                        <motion.button
                          className="group hover:bg-secondary border-border bg-card focus-visible:ring-ring flex h-auto flex-shrink-0 cursor-pointer items-center justify-center space-x-1 rounded-full border px-3 py-2.5 text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none sm:px-4 sm:py-3 sm:text-sm"
                          whileHover={{ scale: 1 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-foreground flex items-center gap-3">
                            <CircleEllipsis
                              className="h-[20px] w-[18px]"
                              strokeWidth={2}
                            />
                          </div>
                        </motion.button>
                      </Drawer.Trigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <AnimatedChevron />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Content — kept as a bottom sheet (vaul measures/calculates
            its own height for drag & snap points, so we only constrain
            width/centering here rather than overriding height) */}
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-100 bg-black/50 backdrop-blur-xs" />
          <Drawer.Content className="bg-background fixed right-0 bottom-0 left-0 z-100 mx-auto flex h-[80%] max-w-xl flex-col rounded-t-[2rem] outline-none lg:h-[60%]">
            <div className="bg-card flex-1 overflow-y-auto rounded-t-[2rem] p-4">
              <div className="mx-auto max-w-md space-y-4">
                <div
                  aria-hidden
                  className="bg-border mx-auto mb-8 h-1.5 w-12 flex-shrink-0 rounded-full"
                />
                <div className="mx-auto w-full max-w-md">
                  <div className="space-y-8 pb-16">
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
        <Icon className="text-foreground h-5 w-5" />
        <Drawer.Title className="font-display text-foreground text-[22px] font-bold">
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
        'flex w-full items-center justify-between rounded-2xl',
        'text-md px-6 py-4 text-left font-normal',
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
          isSpecial
            ? 'text-primary-foreground font-semibold'
            : 'text-foreground'
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
