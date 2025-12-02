// A new component for displaying code blocks with syntax highlighting.
'use client';
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = async () => {
    const showSuccess = () => {
        setHasCopied(true);
        setTimeout(() => {
          setHasCopied(false);
        }, 2000);
    }
    
    const fallbackCopyToClipboard = () => {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "absolute";
      textArea.style.top = "-9999px";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        showSuccess();
      } catch (err) {
        console.error("Fallback: Failed to copy text: ", err);
      }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(code);
            showSuccess();
        } catch (err) {
            console.error("Failed to copy with navigator.clipboard, trying fallback: ", err);
            fallbackCopyToClipboard();
        }
    } else {
      fallbackCopyToClipboard();
    }
  };

  return (
    <div className="bg-muted text-muted-foreground rounded-md p-4 relative font-mono text-sm overflow-x-auto">
      <pre><code>{code}</code></pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={copyToClipboard}
      >
        {hasCopied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="sr-only">Copy code</span>
      </Button>
    </div>
  );
}
