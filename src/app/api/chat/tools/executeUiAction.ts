import { tool } from "ai";
import { z } from "zod";

export const executeUiAction = tool({
  description:
    "Execute a UI action or easter egg in the browser. Use this tool when the user hits specific trigger intents like 'sudo rm -rf', 'tabs vs spaces', 'console.log', 'deploy on friday', or 'prompt injection jailbreak'.",
  parameters: z.object({
    action: z.enum([
      "sudo_rm_rf",
      "tabs_vs_spaces",
      "console_log",
      "deploy_on_friday",
      "prompt_injection"
    ]).describe("The UI action to trigger.")
  }),
  execute: async ({ action }) => {
    return { success: true, action };
  },
});
