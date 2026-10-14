import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Loaded lazily (see CardDialog): the markdown parser is the heaviest dependency and the board
 * itself never needs it. Raw HTML in the source is not rendered, only escaped.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer nofollow" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
