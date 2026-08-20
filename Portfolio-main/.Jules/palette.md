## 2023-10-25 - Converting Framer Motion divs to buttons
**Learning:** When using Framer Motion to animate interactive elements, converting a clickable `motion.div` to a `motion.button` requires explicit layout classes (`w-full`, `block`, `text-left`) to maintain the original visual structure, as buttons have different default display properties than divs.
**Action:** Always verify the visual layout (and use flex/block/text-align classes) when replacing `div` elements with semantic `button` elements to improve accessibility, while adding standard focus-visible styles.
