import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { recipients, sender } = await request.json();

    // Gmail SMTPの設定（環境変数から取得）
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const results = [];
    
    for (const recipient of recipients) {
      try {
        // メール送信
        await transporter.sendMail({
          from: `"${sender.name}" <${sender.email || process.env.GMAIL_USER}>`,
          to: recipient.email,
          subject: recipient.subject,
          text: recipient.body,
          html: recipient.body.replace(/\n/g, '<br>')
        });
        
        results.push({
          email: recipient.email,
          status: 'sent'
        });
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        results.push({
          email: recipient.email,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: `送信完了: ${results.filter(r => r.status === 'sent').length}/${recipients.length}件`
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}