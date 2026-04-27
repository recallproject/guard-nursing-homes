import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/blog.css';

/**
 * Format an ISO date string (YYYY-MM-DD) for display as "Month D, YYYY".
 * Parses as local date to avoid UTC timezone shifting the day.
 */
function formatPublishedDate(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Blog() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('Blog Listing View');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/blog/posts-index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        // Sort reverse chronological in case the file is ever out of order
        const sorted = [...(data.posts || [])].sort((a, b) =>
          (b.publishedDate || '').localeCompare(a.publishedDate || '')
        );
        setPosts(sorted);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Blog — The Oversight Report</title>
        <meta
          name="description"
          content="Writing on nursing home oversight, CMS enforcement data, and healthcare transparency from Robert Benard, NP, founder of DataLink Clinical LLC."
        />
        <meta property="og:title" content="Blog — The Oversight Report" />
        <meta
          property="og:description"
          content="Writing on nursing home oversight, CMS enforcement data, and healthcare transparency."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.oversightreports.com/blog" />
        <link rel="canonical" href="https://www.oversightreports.com/blog" />
      </Helmet>

      <div className="blog-page">
        <div className="blog-inner">
          <header className="blog-header">
            <span className="blog-eyebrow">Blog</span>
            <h1 className="blog-title">Writing on Nursing Home Oversight</h1>
            <p className="blog-subtitle">
              Notes on CMS enforcement data, program integrity, and why federal nursing home
              records should be usable by the people who need them most.
            </p>
          </header>

          {error && (
            <div className="blog-error">
              <p>Could not load posts ({error}).</p>
            </div>
          )}

          {!error && posts === null && (
            <div className="blog-loading">
              <p>Loading posts…</p>
            </div>
          )}

          {!error && posts && posts.length === 0 && (
            <div className="blog-loading">
              <p>No posts yet.</p>
            </div>
          )}

          {!error && posts && posts.length > 0 && (
            <div className="blog-list">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="blog-list-item"
                >
                  <div className="blog-list-meta">
                    <span className="blog-list-category">{post.category}</span>
                    <span className="dot" />
                    <span>{formatPublishedDate(post.publishedDate)}</span>
                    {post.readTime && (
                      <>
                        <span className="dot" />
                        <span>{post.readTime}</span>
                      </>
                    )}
                  </div>
                  <h2 className="blog-list-title">{post.title}</h2>
                  <p className="blog-list-excerpt">{post.excerpt}</p>
                  <span className="blog-list-readmore">Read →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
