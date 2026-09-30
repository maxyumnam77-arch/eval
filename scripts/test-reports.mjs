import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformWithOxc } from 'vite';

const source = await readFile(new URL('../src/reports.ts', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source, 'reports.ts');
const { csvText, reportHtml } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('CSV preserves Unicode, quotes, line breaks, zero marks, and blank pending scores', () => {
  assert.equal(csvText(['Student', 'Feedback', 'Score', 'Maximum'], [
    ['学生', 'A "quote",\nthen another line', 0, 5], ['Sam', '', null, 5],
  ]), '\uFEFF"Student","Feedback","Score","Maximum"\r\n"学生","A ""quote"",\nthen another line","0","5"\r\n"Sam","","","5"');
});

test('untrusted spreadsheet formulas are kept as text', () => {
  assert.equal(csvText(['Value'], [['=1+1'], [' +2'], ['\t@SUM(A1:A3)'], ['-5'], [-5]]),
    '\uFEFF"Value"\r\n"\'=1+1"\r\n"\' +2"\r\n"\'\t@SUM(A1:A3)"\r\n"\'-5"\r\n"-5"');
});

test('print reports escape all user-controlled content and preserve zero and pending marks', () => {
  const html = reportHtml('<script>alert("title")</script>', ['Sam & Lee', 'Line one\nLine two'],
    ['<img onerror="attack">', 'Score'], [["Student's <answer>", 0], ['Pending', null]]);
  assert.ok(!html.includes('<script>') && !html.includes('<img '));
  assert.ok(html.includes('&lt;script&gt;alert(&quot;title&quot;)&lt;/script&gt;'));
  assert.ok(html.includes('Sam &amp; Lee') && html.includes('Student&#39;s &lt;answer&gt;'));
  assert.ok(html.includes('<td>0</td>') && html.includes('<td>Pending</td><td></td>'));
  assert.ok(html.includes('Line one\nLine two') && html.includes('table-header-group'));
});
