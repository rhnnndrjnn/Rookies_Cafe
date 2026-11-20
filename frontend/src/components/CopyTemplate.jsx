import { Icon } from "./ui.jsx"

/**
 * "Step: copy your template first". The submit button stays locked until the customer has copied
 * the current text (editing the form invalidates it, so what's pasted is always up to date).
 */
export default function CopyTemplate({ title, text, copied, onCopy, hint }) {
  return (
    <div className="rounded-2xl border border-earth-300 bg-earth-50 p-5 shadow-md sm:p-8">
      <p className="eyebrow">{title}</p>
      <p className="mt-3 text-sm leading-6 text-earth-600">{hint}</p>
      <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-earth-300 bg-earth-100 p-4 font-sans text-xs leading-5 text-earth-800">
        {text || "Fill in the form above and your template will appear here."}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className={`mt-4 w-full justify-center ${copied ? "btn-sm solid !py-3" : "secondary-button"}`}
      >
        <Icon name={copied ? "check" : "copy"} size={17} /> {copied ? "Copied — you can continue" : "Copy template first"}
      </button>
    </div>
  )
}
