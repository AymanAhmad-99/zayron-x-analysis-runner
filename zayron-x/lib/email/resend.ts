import { Resend } from 'resend';

export function getResend(env: any) {
  return new Resend(env.RESEND_API_KEY);
}

export async function sendNewsletterNotification(
  env: any,
  article: {
    title: string;
    excerpt: string;
    slug: string;
    category: string;
  },
  subscribers: string[],
) {
  const resend = getResend(env);

  const { data, error } = await resend.emails.send({
    from: 'ZAYRON-X Intelligence <noreply@zayron-x.com>',
    to: subscribers,
    subject: `[تنبيه استخباراتي] ${article.title}`,
    html: `
      <div dir="rtl" style="font-family: sans-serif;">
        <h2>${article.title}</h2>
        <p>${article.excerpt}</p>
        <a href="https://zayron-x.com/intelligence/${article.category}/${article.slug}">
          اقرأ التقرير الكامل
        </a>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
  return data;
}
