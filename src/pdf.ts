import * as vscode from "vscode";
import * as path from "path";
import { editorText } from "./editor";
import { getConfig, NovelSettings } from "./config";
import * as cp from "child_process";
import exp = require("constants");
import { draftRoot } from "./compile";
import { parseGetRemotes } from "simple-git/dist/src/lib/responses/GetRemoteSummary";

const output = vscode.window.createOutputChannel("Novel");
let vivlioLaunching = false;

export function previewpdf() {
  exportpdf(true);
}

export async function exportpdf(preview: boolean | undefined): Promise<void> {
  const myHtml = getPrintContent();
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.showWarningMessage(`找不到Workspace`);
    return;
  } else {
    let fileName: string | undefined;
    if (!preview) {
      const filePath = vscode.window.activeTextEditor?.document.fileName;
      const pdfName = filePath
        ? path.basename(filePath).replace(/\.[a-zA-Z]+$/, "")
        : "名称未設定";
      fileName = await vscode.window.showInputBox({
        title: "ファイル名の設定",
        prompt: `出力するPDFのファイル名を入力してください`,
        placeHolder: pdfName,
        value: pdfName,
        ignoreFocusOut: false,
      });
    }
    const folderUri = vscode.workspace.workspaceFolders[0].uri;
    const myPath = vscode.Uri.joinPath(folderUri, "publish.html");
    const myWorkingDirectory = folderUri;
    const vivlioCommand = "vivliostyle";
    const vivlioSubCommand = preview ? "preview" : "build";
    const execPath = draftRoot().match(/^[a-z]:\\/)
      ? myPath.path.replace(/^\//, "")
      : myPath;
    const vivlioExportPath = !preview
      ? vscode.Uri.joinPath(myWorkingDirectory, `${fileName}.pdf`).fsPath
      : "";
    const vivlioExportOption = !preview ? "-o" : "";

    output.appendLine(`starting to publish: ${myPath}`);
    const vivlioParams = [
      vivlioSubCommand,
      "--no-sandbox",
      myPath.path,
      vivlioExportOption,
      path.normalize(vivlioExportPath),
      // "-o",
      // vscode.Uri.joinPath(myWorkingDirectory, "output.pdf").fsPath,
    ];

    const myHtmlBinary = Buffer.from(myHtml, "utf8");

    vscode.workspace.fs.writeFile(myPath, myHtmlBinary).then(() => {
      output.appendLine(`saving pdf to ${vivlioCommand}`);

      if (!vivlioLaunching || !preview) {
        vivlioLaunching = preview ? true : false;
        if (preview) {
          vscode.window.showInformationMessage(
            `准备预览中... \n首次启动需要一些时间`
          );
        } else {
          vscode.window.showInformationMessage(
            `Vivliostyle启动中...\n首次启动需要一些时间`
          );
        }
        const vivlioProcess = cp.exec(
          `${vivlioCommand} ${vivlioSubCommand} ${execPath} ${vivlioExportOption} ${vivlioExportPath}`,
          (err, stdout, stderr) => {
            if (err) {
              output.appendLine(`Vivlio报告错误: ${err.message}`);
              vivlioLaunching = false;
              return;
            }
            if (stdout) {
              console.log(`Vivlio输出： ${stdout}`);
            }
            if (stderr) {
              console.log(`Vivlio输出错误： ${stderr}`);
            }
            if (!preview) {
              output.appendLine(`文件名: ${stdout}`);
              output.appendLine("PDF保存完成");
            }
            vscode.window.showInformationMessage(`PDF保存完成`);
            vivlioLaunching = false;
          }
        );

        vivlioProcess.on("close", (code, signal) => {
          if (vivlioProcess.killed) {
            //exportpdf(true);
            vivlioLaunching = false;
          }
          console.log(
            `ERROR: child terminated. Exit code: ${code}, signal: ${signal}`
          );
        });
      } else {
        vscode.window.showInformationMessage(`预览创建完成`);
      }
    });
  }
}

function getPrintContent() {
  //读取配置configuration

  const myText = editorText("active").replace(
    /<span id="cursor">(.*)<\/span>/g,
    "$1"
  );
  const previewSettings: NovelSettings = getConfig();
  const writingDirection = previewSettings.writingDirection;
  const printBoxInlineLength = (writingDirection === 'vertical-rl')? 168: 124.32; // 文档高度的80％（上下边缘的10％的数量）
  const printBoxBlockSize = (writingDirection === 'vertical-rl')? 124.32: 168; // 文档宽度的84％（左右边缘的数量通过16％）
  const fontSize =
    previewSettings.lineLength >
    previewSettings.linesPerPage * 1.75 * (printBoxInlineLength / printBoxBlockSize)
      ? printBoxInlineLength / previewSettings.lineLength
      : printBoxBlockSize / (previewSettings.linesPerPage * 1.75);
  // 毫米的字体尺寸
  const fontSizeWithUnit = fontSize + "mm";
  const lineHeightWithUnit = fontSize * 1.75 + "mm";
  const projectTitle = vscode.workspace.workspaceFolders![0].name;
  const typeSettingHeight = fontSize * previewSettings.lineLength;
  const typeSettingHeightUnit = typeSettingHeight + "mm";
  const typeSettingWidth = fontSize * 1.75 * previewSettings.linesPerPage;
  const typeSettingWidthUnit = typeSettingWidth + "mm";
  const columnCount = Math.floor(
    printBoxInlineLength / (typeSettingHeight + fontSize * 2)
  );
  const pageStartingCss =
    previewSettings.pageStarting == "左"
      ? "break-before: left;\n"
      : "break-before: right;\n";
  console.log(
    "column",
    `${printBoxInlineLength} / (${typeSettingHeight} + ${fontSize} * 2)`
  );
  const originPageNumber = previewSettings.originPageNumber;

  const noColumnGap = columnCount == 1 ? "2em" : "0";
  const columnCSS =
    columnCount > 1
      ? `column-count: ${columnCount};
  column-fill: auto;`
      : "";
  const columnHeitghtRate =
    "calc(" + fontSize * previewSettings.lineLength + "mm + 0.5em)";

  const typesettingInformation = `${previewSettings.lineLength}字×${previewSettings.linesPerPage}行`;

  const pageNumberFormatR = eval(
    "`" +
      previewSettings.numberFormatR
        .replace(/\${pageNumber}/, "counter(page)")
        .replace(/(.*)counter\(page\)(.*)/, '"$1"counter(page)"$2"') +
      ";`"
  );
  const pageNumberFormatL = eval(
    "`" +
      previewSettings.numberFormatR
        .replace(/\${pageNumber}/, "counter(page)")
        .replace(/(.*)counter\(page\)(.*)/, '"$1"counter(page)"$2"') +
      ";`"
  );

  console.log(pageNumberFormatR);

  return `<!DOCTYPE html>
  <html lang="ja">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${projectTitle}</title>

      <style>
      @charset "UTF-8";
      html {
      orphans: 1;
      widows: 1;
      }

      body{
        writing-mode: ${previewSettings.writingDirection};
      }

      * {
      margin: 0;
      padding: 0;
      }

      @page {
        size: 148mm 210mm;
        block-size: calc(${fontSizeWithUnit} * 1.75 * ${
    previewSettings.linesPerPage
  } + (${fontSizeWithUnit} * 0.4));
        margin-top: 10%;
        margin-bottom: 10%;
        margin-left: 8%;
        margin-right: 8%;
        /* 以下、マージンボックスに継承される */
        font-size: 6pt;
        font-family: "游明朝", "YuMincho", serif;
        /* 本来不要（<span class="smaller"><span class="smaller">ルート要素の指定が継承される</span></span>）だが、現時点のvivliostyle.jsの制限により必要 */
        vertical-align: top;
      }

      @page : first {
        counter-reset: page ${originPageNumber - 1};
      }

      @page :left {
        margin-right: 6%;
        margin-left: 10%;
        @bottom-left {
          content: ${pageNumberFormatR}
          margin-left: 0mm;
          margin-bottom: 5%;
          writing-mode: horizontal-tb;
          font-size:10q;
          /* 在CSS规范中，您可以在@page规则中写入，但这是当前的vivliostyle.js限制。 */
      }
    }
      
      @page :right {
        margin-left: 6%;
        margin-right: 10%;
        /* border-bottom: 1pt solid black; */
      /* 右下角 */
      @bottom-right {
          content: ${pageNumberFormatR}
          margin-right: 0mm;
          margin-bottom: 5%;
          writing-mode: horizontal-tb;
          font-size:10q;
          /* 在CSS规范中，您可以在@page规则中写入，但这是当前的vivliostyle.js限制。 */
      }
      }
  
      html {
      font-family: "游明朝", "YuMincho", serif;
      font-weight: Medium;
      text-align: justify;
      hanging-punctuation: allow-end;
      text-spacing: none;
      }
  
      body{
        ${pageStartingCss}
        ${columnCSS}
      }
  
      div#draft{
        inline-size: ${columnHeitghtRate};
        margin-inline-start: auto;
        margin-inline-end: auto;
      }

      h1 {
      /* 字体 */
      font-weight: Extrabold;
      /* 字体大小 */
      font-size: 24q;
      /* 字下げ */
      text-indent: 0;
      /* 页面之后・改段禁止 */
      page-break-before: always;
      page-break-after: always;
      line-height: 42q;
      letter-spacing: 0.25em;
      display: flex;
      align-items: center;
      }
  
      h2 {
      /* 字体 */
      font-weight: Demibold;
      /* 字体大小 */
      font-size: 16q;
      /* 字下げ */
      text-indent: 3em;
      /* 页面之后・改段禁止 */
      page-break-before: always;
      page-break-after: avoid;
      line-height: 42q;
      margin-left: 2em;
      }
  
      h2.part {
      block-size: 80mm;
      padding: 0mm 35mm;
      font-weight: bold;
      font-size: 16q;
      page-break-before: always;
      page-break-after: always;
      margin-block-end: 4em;
      }
  
      h1 + h2 {
      margin-block-start: 16pt;
      }
  
      ruby > rt {
      font-size: 6.5q;
      }
  
      p {
        font-size: ${fontSizeWithUnit};
        line-height: 1.75;
        inline-size: ${columnHeitghtRate};
        text-indent: 0em;
        hanging-punctuation: allow-end;
        line-break:strict;
        page-break-inside: auto;
      }

    div.indent-1 p:first-of-type, div.indent-2 p:first-of-type, div.indent-3 p:first-of-type{
      padding-block-start: calc( ${fontSizeWithUnit} * ${
    previewSettings.lineHeightRate
  });
      }

      div.indent-1 p:last-of-type, div.indent-2 p:last-of-type, div.indent-3 p:last-of-type{
      padding-block-end: calc( ${fontSizeWithUnit} * ${
    previewSettings.lineHeightRate
  });
      }

    
    div.indent-1 p{
    height: calc( ${columnHeitghtRate} - ${fontSizeWithUnit});
    padding-inline-start: calc( ${fontSizeWithUnit});
    }

    div.indent-2 p{
    height: calc( ${columnHeitghtRate} - (${fontSizeWithUnit} * 2));
    padding-inline-start: calc(${fontSizeWithUnit} * 2);
    }

    div.indent-3 p{
    height: calc( ${columnHeitghtRate} - (${fontSizeWithUnit} * 3));
    padding-inline-start: calc(${fontSizeWithUnit} * 3);
    }

    p.goth {
    margin-inline-start: 3em;
    font-family: "游ゴシック", "YuGothic", san-serif;
    margin-block-start: 1em;
    margin-block-end: 1em;
    }

    p.align-rb {
    text-align: end;
    }

    p.goth + p.goth {
    margin-block-start: -1em;
    }

    div.codes {
    display: inline-block;
    margin: 3em 1em;
    writing-mode: horizontal-tb;
    padding: 1em;
    font-family: "Courier", monospace;
    font-size: 0.8em;
    }
  
    div.codes p {
    text-orientation: sideways;
    }

    p.star {
    text-indent: 3em;
    margin-right: 16pt;
    margin-left: 16pt;
    }

    hr {
    border: none;
    border-right: 1pt solid black;
    height: 6em;
    margin: auto 8.5pt;
    }

    /* 縦中横 */
    .tcy:dir(rtl) {
    -webkit-text-combine: horizontal;
    text-combine: horizontal;
    -ms-text-combine-horizontal: all;
    text-combine-horizontal: digit 2;
    text-combine-upright: digit 2;
    }

    /* 圏点（<span class="smaller">ゴマ</span>） */
    em.side-dot, em.sesame_dot {
    font-style: normal;
    -webkit-text-emphasis-style: sesame;
    text-emphasis-style: sesame;
    margin-block-start: -1em;
    display: inline-block;
    }

    /*著作者*/
    .author {
    position: absolute;
    bottom: 0;
    font-size: 8.5pt;
    margin-inline-start: 50pt;
    letter-spacing: normal;
    }

    /*画像＋标题*/
    figure {
    display: block;
    width: 236pt;
    -ms-writing-mode: lr-tb;
    -webkit-writing-mode: horizontal-tb;
    writing-mode: horizontal-tb;
    }

    figure img {
    width: 100%;
    height: auto;
    vertical-align: bottom;
    }

    figcaption {
    text-align: start;
    font-size: 7pt;
    }

    /*版权*/
    .colophon {
    font-size: 7pt;
    margin-right: 48pt;
    }
    /* 小字 */
    span.smaller{
        font-size:6.5pt
    }
  
    div.comment {
        display:none;
    }

    p.blank {
        color:transparent;
    }

    span.blank{
      display:none;
    }
    </style>

  </head>
  <body>
  <div id="draft">
  ${myText}
  </div>
  </body>
  </html>`;
}
