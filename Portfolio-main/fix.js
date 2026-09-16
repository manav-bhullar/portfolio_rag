const fs = require("fs");
const path = "src/components/crazy.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(/<strong className="text-foreground">The Hook:<\/strong> /g, "");
content = content.replace(/<strong className="text-foreground">The Villain \(The Bottleneck\):<\/strong> /g, "");
content = content.replace(/<strong className="text-foreground">The Investigation &amp; Failed Attempts:<\/strong> /g, "");
content = content.replace(/<strong className="text-foreground">The Climax \(The &apos;Aha&apos; Moment\):<\/strong> /g, "");
content = content.replace(/<p className="font-semibold text-foreground">The Transformation \(The Payoff\):<\/p>\s*<p className="mt-1">/g, "<p className=\\"mt-1\\">\\n              <strong>The Result:</strong>");

fs.writeFileSync(path, content);
