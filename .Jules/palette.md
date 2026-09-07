## 2026-09-07 - [React.cloneElement for Triggers]
**Learning:** Wrapping custom trigger props in a 'div' element creates invalid HTML nesting (if a button is passed) and breaks accessibility structure.
**Action:** Use 'React.cloneElement' to safely inject event handlers like 'onClick' directly onto the custom trigger element.
