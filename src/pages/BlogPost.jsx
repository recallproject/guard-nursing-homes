import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [allPosts, setAllPosts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | notfound | error
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Reading progress bar: tracks scroll position within the content area.
  useEffect(() => {
    if (status !== 'ok') return undefined;
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);
      if (docHeight <= 0) {
        setReadProgress(0);
        return;
      }
      const pct = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
      setReadProgress(pct);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setPost(null);

    // Only load known slugs via the index to avoid arbitrary fetches.
    fetch('/data/blog/posts-index.json')
      .then((res) => {
        if (!res.ok) throw new Error('index_fetch_failed');
        return res.json();
      })
      .then((index) => {
        const posts = index.posts || [];
        if (!cancelled) setAllPosts(posts);
        const known = posts.some((p) => p.slug === slug);
        if (!known) {
          if (!cancelled) setStatus('notfound');
          return null;
        }
        return fetch(`/data/blog/${encodeURIComponent(slug)}.json`).then((res) => {
          if (!res.ok) throw new Error('post_fetch_failed');
          return res.json();
        });
      })
      .then((data) => {
        if (cancelled || !data) return;
        setPost(data);
        setStatus('ok');
        if (typeof window !== 'undefined' && window.plausible) {
          window.plausible('Blog Post View', {
            props: { slug: data.slug, category: data.category || '' },
          });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === 'loading') {
    return (
      <div className="blog-post">
        <div className="blog-post-inner">
          <Link to="/blog" className="blog-back-link">← All posts</Link>
          <div className="blog-loading"><p>Loading…</p></div>
        </div>
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <>
        <Helmet>
          <title>Post Not Found — The Oversight Report</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="blog-post">
          <div className="blog-post-inner">
            <Link to="/blog" className="blog-back-link">← All posts</Link>
            <div className="blog-error">
              <h1>Post Not Found</h1>
              <p>This blog post does not exist.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (status === 'error' || !post) {
    return (
      <div className="blog-post">
        <div className="blog-post-inner">
          <Link to="/blog" className="blog-back-link">← All posts</Link>
          <div className="blog-error">
            <h1>Could not load post</h1>
            <p>Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  const canonicalUrl = `https://www.oversightreports.com/blog/${post.slug}`;
  const metaTitle = post.seo?.metaTitle || `${post.title} — The Oversight Report`;
  const metaDescription = post.seo?.metaDescription || post.excerpt || '';
  const ogImage = post.seo?.ogImage || 'https://www.oversightreports.com/og-default.png';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || metaDescription,
    datePublished: post.publishedDate,
    dateModified: post.updatedDate || post.publishedDate,
    author: {
      '@type': 'Person',
      name: post.author || 'Robert Benard, NP',
    },
    publisher: {
      '@type': 'Organization',
      name: 'OversightReports.com',
      url: 'https://www.oversightreports.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    articleSection: post.category || undefined,
    keywords: Array.isArray(post.tags) ? post.tags.join(', ') : undefined,
  };

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="article:published_time" content={post.publishedDate} />
        {post.updatedDate && (
          <meta property="article:modified_time" content={post.updatedDate} />
        )}
        {post.author && <meta property="article:author" content={post.author} />}
        {post.category && (
          <meta property="article:section" content={post.category} />
        )}
        {Array.isArray(post.tags) &&
          post.tags.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div
        className="blog-progress-bar"
        style={{ width: `${readProgress}%` }}
        aria-hidden="true"
      />

      <div className="blog-post">
        <div className="blog-post-inner">
          <Link to="/blog" className="blog-back-link">← All posts</Link>

          <div className="blog-post-header-card">
            <div className="blog-post-meta">
              {post.category && (
                <span className="blog-post-category">{post.category}</span>
              )}
              {post.category && <span className="dot" />}
              <span>{formatPublishedDate(post.publishedDate)}</span>
              {post.readTime && (
                <>
                  <span className="dot" />
                  <span>{post.readTime}</span>
                </>
              )}
            </div>

            <h1 className="blog-post-title">{post.title}</h1>

            <div className="blog-post-byline">
              <span>
                By <strong>{post.author || 'Robert Benard, MS, RN, CNS, AGACNP-BC, PMHNP-BC'}</strong>
              </span>
            </div>
          </div>

          <div className="blog-post-content-card">
            <article
              className="blog-post-content"
              // Content is authored and committed to the repo in controlled JSON files;
              // no untrusted user input is rendered here.
              dangerouslySetInnerHTML={{ __html: post.content || '' }}
            />

            {Array.isArray(post.tags) && post.tags.length > 0 && (
              <div className="blog-post-tags">
                {post.tags.map((tag) => (
                  <span key={tag} className="blog-post-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Author bio card */}
          <div className="blog-author-card">
            <div className="blog-author-avatar" aria-hidden="true">RB</div>
            <div className="blog-author-info">
              <p className="blog-author-name">Written by</p>
              <h3 className="blog-author-fullname">Robert Benard</h3>
              <p className="blog-author-credentials">MS, RN, CNS, AGACNP-BC, PMHNP-BC</p>
              <p className="blog-author-bio">
                Practicing psychiatric-mental health nurse practitioner with a background in ER, ICU, neuro, and addiction medicine. Founder of DataLink Clinical LLC and creator of OversightReports.com — a public transparency platform covering all 14,713 Medicare-certified nursing homes built from 18 federal data sources.
              </p>
            </div>
          </div>

          {/* Related posts */}
          {allPosts.length > 1 && (
            <div className="blog-related">
              <h3 className="blog-related-label">Keep reading</h3>
              <div className="blog-related-list">
                {allPosts
                  .filter((p) => p.slug !== post.slug)
                  .slice(0, 3)
                  .map((p) => (
                    <Link
                      key={p.slug}
                      to={`/blog/${p.slug}`}
                      className="blog-related-item"
                    >
                      <div className="blog-related-item-meta">
                        {p.category} · {formatPublishedDate(p.publishedDate)}
                      </div>
                      <h4 className="blog-related-item-title">{p.title}</h4>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
