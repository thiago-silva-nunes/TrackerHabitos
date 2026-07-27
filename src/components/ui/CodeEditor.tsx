import { useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/* ─────────────────────────────────────────────────────────
   HTML-escape + span helpers
───────────────────────────────────────────────────────── */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function sp(cls: string, text: string): string {
  return `<span class="${cls}">${esc(text)}</span>`;
}

/* ─────────────────────────────────────────────────────────
   JS / TS / Java / C# / Go / Rust / PHP / Python / Bash / SQL
───────────────────────────────────────────────────────── */
const JS_KW = new Set([
  // JS / TS
  "abstract","as","async","await","break","case","catch","class","const",
  "continue","debugger","declare","default","delete","do","else","enum",
  "export","extends","false","finally","for","from","function","if",
  "implements","import","in","infer","instanceof","interface","keyof","let",
  "module","namespace","never","new","null","of","override","private",
  "protected","public","readonly","return","satisfies","static","super",
  "switch","this","throw","true","try","type","typeof","undefined","var",
  "void","while","with","yield","unknown","any","string","number","boolean",
  "object","symbol","bigint",
  // Python
  "and","def","del","elif","except","exec","global","lambda","not","or",
  "pass","print","raise","with","nonlocal","assert","finally",
  // SQL
  "SELECT","FROM","WHERE","INSERT","INTO","VALUES","UPDATE","SET","DELETE",
  "CREATE","TABLE","ALTER","DROP","INDEX","JOIN","LEFT","RIGHT","INNER",
  "OUTER","ON","AS","AND","OR","NOT","NULL","IS","IN","LIKE","BETWEEN",
  "ORDER","BY","GROUP","HAVING","LIMIT","OFFSET","DISTINCT","UNION","ALL",
  "EXISTS","PRIMARY","KEY","FOREIGN","REFERENCES","UNIQUE","DEFAULT",
  "CASCADE","CONSTRAINT","BEGIN","COMMIT","ROLLBACK","TRANSACTION",
  // Bash
  "then","elif","fi","done","esac","source","echo","exit",
  // Go / Rust / Java
  "package","chan","defer","go","map","range","select","struct","var","fn",
  "mut","use","pub","mod","impl","trait","where","Self","self","match","ref",
  "move","unsafe","extern","crate","dyn","box","fun","val","when","object",
  "companion","data","sealed","open","operator","init","by","it","get",
]);

const JS_BUILTIN = new Set([
  "console","Math","JSON","Object","Array","String","Number","Boolean",
  "Promise","Error","Symbol","Map","Set","WeakMap","WeakSet","Proxy",
  "Reflect","Date","RegExp","Function","parseInt","parseFloat","isNaN",
  "isFinite","encodeURI","decodeURI","setTimeout","clearTimeout",
  "setInterval","clearInterval","fetch","window","document","process",
  "require","module","exports","Buffer","NaN","Infinity","globalThis",
  // Python builtins
  "print","len","range","list","dict","tuple","set","type","str","int",
  "float","bool","input","open","zip","map","filter","enumerate","sorted",
  "reversed","isinstance","issubclass","hasattr","getattr","setattr",
  "delattr","dir","vars","repr","format","min","max","sum","abs","round",
]);

function highlightJs(code: string): string {
  const re =
    /(`(?:[^`\\]|\\.)*`)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\/\*[\s\S]*?\*\/)|(\/\/[^\n]*)|(#[^\n]*)|(\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([a-zA-Z_$][\w$]*(?=\s*\())|([a-zA-Z_$][\w$]*)|([{}()\[\]])|([=!<>+\-*\/%&|^~?:;,.])/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out += esc(code.slice(last, m.index));
    last = m.index + m[0].length;
    const [full, tmpl, dq, sq, bc, lc, hash, , call, id, brk, op] = m;
    if (tmpl || dq || sq)       out += sp("ce-str", full);
    else if (bc || lc || hash)  out += sp("ce-cmt", full);
    else if (m[7] !== undefined) out += sp("ce-num", full);   // num group
    else if (call) {
      out += JS_KW.has(call) ? sp("ce-kw", call) :
             JS_BUILTIN.has(call) ? sp("ce-bi", call) :
             sp("ce-fn", call);
    }
    else if (id) {
      out += JS_KW.has(id)     ? sp("ce-kw", id) :
             JS_BUILTIN.has(id)? sp("ce-bi", id) : esc(id);
    }
    else if (brk) out += sp("ce-pu", full);
    else if (op)  out += sp("ce-op", full);
    else          out += esc(full);
  }
  if (last < code.length) out += esc(code.slice(last));
  return out;
}

/* ─────────────────────────────────────────────────────────
   HTML
───────────────────────────────────────────────────────── */
function highlightHtmlTag(tag: string): string {
  const inner = /^(<\/?)([a-zA-Z][a-zA-Z0-9\-]*)(.*)(\s*\/?>)$/s.exec(tag);
  if (!inner) return esc(tag);
  const [, open, name, attrs, close] = inner;
  // attrs: highlight attribute names and values
  const attrRe = /([a-zA-Z_:][a-zA-Z0-9\-_:.]*)|(=)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')/g;
  let attrOut = "";
  let attrLast = 0;
  let am: RegExpExecArray | null;
  attrRe.lastIndex = 0;
  while ((am = attrRe.exec(attrs)) !== null) {
    if (am.index > attrLast) attrOut += esc(attrs.slice(attrLast, am.index));
    attrLast = am.index + am[0].length;
    const [afull, aname, aeq, adq, asq] = am;
    if (aeq)       attrOut += sp("ce-op", "=");
    else if (adq || asq) attrOut += sp("ce-str", afull);
    else if (aname) attrOut += sp("ce-attr", aname);
    else attrOut += esc(afull);
  }
  if (attrLast < attrs.length) attrOut += esc(attrs.slice(attrLast));
  return sp("ce-pu", open) + sp("ce-tag", name) + attrOut + sp("ce-pu", close);
}

function highlightHtml(code: string): string {
  const re = /(<!--[\s\S]*?-->)|(<!DOCTYPE[^>]*>)|(<\/?[a-zA-Z][a-zA-Z0-9\-]*(?:\s[^>]*)?>)/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out += esc(code.slice(last, m.index));
    last = m.index + m[0].length;
    const [full, comment, doctype, tag] = m;
    if (comment)      out += sp("ce-cmt", full);
    else if (doctype) out += sp("ce-kw", full);
    else if (tag)     out += highlightHtmlTag(full);
    else              out += esc(full);
  }
  if (last < code.length) out += esc(code.slice(last));
  return out;
}

/* ─────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────── */
function highlightCss(code: string): string {
  const re =
    /(\/\*[\s\S]*?\*\/)|(@[\w-]+)|(#[\da-fA-F]{3,8}\b)|(-?\d+(?:\.\d+)?(?:%|px|em|rem|vh|vw|pt|cm|mm|in|deg|rad|turn|s|ms|fr|ch|ex|vmin|vmax)?\b)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([\w-]+(?=\s*:))|([{}():;,>~+\[\].#@])|([a-zA-Z_-][\w-]*)/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out += esc(code.slice(last, m.index));
    last = m.index + m[0].length;
    const [full, cmt, atrule, color, num, str, prop, pu, word] = m;
    if (cmt)         out += sp("ce-cmt", full);
    else if (atrule) out += sp("ce-kw", full);
    else if (color)  out += sp("ce-str", full);
    else if (num)    out += sp("ce-num", full);
    else if (str)    out += sp("ce-str", full);
    else if (prop)   out += sp("ce-attr", full);
    else if (pu)     out += sp("ce-pu", full);
    else if (word)   out += sp("ce-bi", full);
    else             out += esc(full);
  }
  if (last < code.length) out += esc(code.slice(last));
  return out;
}

/* ─────────────────────────────────────────────────────────
   JSON
───────────────────────────────────────────────────────── */
function highlightJson(code: string): string {
  const re = /("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}()\[\]:,])/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) out += esc(code.slice(last, m.index));
    last = m.index + m[0].length;
    const [full, str, kw, num, pu] = m;
    if (str)       out += sp("ce-str", full);
    else if (kw)   out += sp("ce-kw", full);
    else if (num)  out += sp("ce-num", full);
    else if (pu)   out += sp("ce-pu", full);
    else           out += esc(full);
  }
  if (last < code.length) out += esc(code.slice(last));
  return out;
}

/* ─────────────────────────────────────────────────────────
   Dispatch
───────────────────────────────────────────────────────── */
function highlight(code: string, lang: string): string {
  if (!code) return "";
  try {
    if (lang === "html" || lang === "xml")          return highlightHtml(code);
    if (lang === "css" || lang === "scss" || lang === "less") return highlightCss(code);
    if (lang === "json")                             return highlightJson(code);
    return highlightJs(code); // js, ts, python, bash, sql, java, c#, go, rust, php…
  } catch {
    return esc(code);
  }
}

/* ─────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────── */
export interface CodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  language?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  onClick?: () => void;
  showLineNumbers?: boolean;
  /**
   * false (default): fills its parent height with flex (for full-height panels like Terminal).
   * true: grows with content like a <textarea rows> (for code blocks in cards).
   */
  autoHeight?: boolean;
  minLines?: number;    // minimum visible lines when autoHeight=true (default 8)
  maxLines?: number;    // max lines before scroll when autoHeight=true (default 40)
  className?: string;
  style?: React.CSSProperties;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const FONT    = "'Fira Code','Cascadia Code','JetBrains Mono','Courier New',monospace";
const PAD_PX  = 12;   // px – must match CSS .ce-backdrop / .ce-ta padding
const FS      = 13;   // px
const LH      = 1.7;  // unitless line-height
const LINE_PX = FS * LH; // ≈ 22.1 px per line

export function CodeEditor({
  value,
  onChange,
  language = "javascript",
  onKeyDown,
  readOnly  = false,
  autoFocus = false,
  placeholder,
  onClick,
  showLineNumbers = true,
  autoHeight = false,
  minLines   = 8,
  maxLines   = 40,
  className  = "",
  style,
  textareaRef: extRef,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const taRef  = (extRef ?? internalRef) as React.RefObject<HTMLTextAreaElement>;
  const preRef = useRef<HTMLPreElement>(null);
  const lnRef  = useRef<HTMLDivElement>(null);

  const lineCount = (value || "").split("\n").length;
  const html      = highlight(value || "", language);

  // Sync scroll — pre + line-numbers follow the textarea
  const syncScroll = useCallback(() => {
    const ta = taRef.current;
    const pr = preRef.current;
    const ln = lnRef.current;
    if (!ta || !pr) return;
    pr.scrollTop  = ta.scrollTop;
    pr.scrollLeft = ta.scrollLeft;
    if (ln) ln.scrollTop = ta.scrollTop;
  }, [taRef]);

  useEffect(() => { syncScroll(); }, [value, syncScroll]);

  // Compute container height for autoHeight mode
  const contentLines = Math.max(lineCount, minLines);
  const clampedLines = Math.min(contentLines, maxLines);
  const containerH   = clampedLines * LINE_PX + PAD_PX * 2;

  const sharedFont: React.CSSProperties = {
    fontFamily: FONT,
    fontSize:   `${FS}px`,
    lineHeight: LH,
    padding:    `${PAD_PX}px`,
    tabSize:    2,
    margin:     0,
    whiteSpace: "pre",
  };

  const themeClass = isDark ? "ce-dark" : "ce-light";

  /* ── autoHeight layout ── */
  if (autoHeight) {
    return (
      <div
        className={`ce-auto ${themeClass} ${className}`}
        style={{ height: containerH, ...style }}
      >
        {showLineNumbers && (
          <div
            ref={lnRef}
            className="ce-ln"
            aria-hidden
            style={{ fontFamily: FONT, fontSize: `${FS}px`, lineHeight: LH }}
          >
            {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
          </div>
        )}
        <div className="ce-area">
          <pre
            ref={preRef}
            className="ce-backdrop"
            aria-hidden
            style={sharedFont}
            dangerouslySetInnerHTML={{ __html: html + "\n" }}
          />
          <textarea
            ref={taRef}
            value={value}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            onKeyDown={onKeyDown}
            onScroll={syncScroll}
            readOnly={readOnly}
            autoFocus={autoFocus}
            placeholder={placeholder}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            onClick={onClick}
            className="ce-ta"
            style={{ ...sharedFont, caretColor: isDark ? "#e8e8f0" : "#1e1e2e" }}
          />
        </div>
      </div>
    );
  }

  /* ── full-height layout (terminal) ── */
  return (
    <div
      className={`ce-wrap ${themeClass} ${className}`}
      style={style}
    >
      {showLineNumbers && (
        <div
          ref={lnRef}
          className="ce-ln"
          aria-hidden
          style={{ fontFamily: FONT, fontSize: `${FS}px`, lineHeight: LH }}
        >
          {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
        </div>
      )}
      <div className="ce-area">
        <pre
          ref={preRef}
          className="ce-backdrop"
          aria-hidden
          style={sharedFont}
          dangerouslySetInnerHTML={{ __html: html + "\n" }}
        />
        <textarea
          ref={taRef}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          readOnly={readOnly}
          autoFocus={autoFocus}
          placeholder={placeholder}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          onClick={onClick}
          className="ce-ta"
          style={{ ...sharedFont, caretColor: isDark ? "#e8e8f0" : "#1e1e2e" }}
        />
      </div>
    </div>
  );
}
