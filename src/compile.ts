import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getConfig } from "./config";
import { deadLineFolderPath } from "./extension";
import { countContentCharacter, removeNonContentCharacter } from "./contentcharacterutils"

//如何使用FS模块 https://qiita.com/oblivion/items/2725a4b3ca3a99f8d1a3
export default function compileDocs(): void {
  const projectName =
    deadLineFolderPath() == ""
      ? vscode.workspace.workspaceFolders?.[0].name
      : vscode.workspace.workspaceFolders?.[0].name +
        "-" +
        path.basename(deadLineFolderPath());
  const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  const config = getConfig();
  const separatorString = "\n\n　　　" + config.separator + "\n\n";
  const draftRootPath =
    deadLineFolderPath() == "" ? draftRoot() : deadLineFolderPath();

  console.log("ProjectName: ", projectName);
  console.log("截止文件夹", deadLineFolderPath());

  //      publishフォルダがなければ作る
  if (!fs.existsSync(projectPath + "/publish")) {
    fs.mkdirSync(projectPath + "/publish");
  }

  //  创建一个空文件
  const compiledTextFilePath = projectPath + "/publish/" + projectName + ".txt";
  try {
    fs.writeFileSync(compiledTextFilePath, "");
  } catch (err) {
    console.log("写入文件时发生错误", err);
  }

  //  テキストを書き込む
  const filelist = fileList(draftRootPath).files;
  filelist.forEach((listItem: { dir?: string; depthIndicator?: number }) => {
    let appendingContext = "";
    if (listItem.dir) {
      appendingContext = fs.readFileSync(listItem.dir, "utf8");
    } else if (listItem.depthIndicator) {
      appendingContext = separatorString;
    }
    fs.appendFileSync(compiledTextFilePath, appendingContext);
  });
  //console.log(fileList(draftRootPath, 0).files);
}

export function draftRoot(): string {
  if (
    vscode.workspace.name == undefined ||
    vscode.workspace.workspaceFolders == undefined
  ) {
    return "";
  } else {
    const projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let draftRootPath = projectPath;
    const projectFiles = fs.readdirSync(projectPath);
    //将「原稿」或者「Draft」作为文件夹Path
    if (
      projectFiles.includes("Draft") &&
      fs.statSync(projectPath + "/Draft").isDirectory()
    ) {
      draftRootPath = draftRootPath + "/Draft";
    } else if (
      projectFiles.includes("原稿") &&
      fs.statSync(projectPath + "/原稿").isDirectory()
    ) {
      draftRootPath = draftRootPath + "/原稿";
    } else if (
      projectFiles.includes("src") &&
      fs.statSync(projectPath + "/src").isDirectory()
    ) {
      draftRootPath = draftRootPath + "/src";
    }

    return draftRootPath;
  }
}

type File = {
  dir?: string;
  name?: string;
  length?: number;
  directoryName?: string;
  directoryLength?: number;
  depthIndicator?: number;
};

type FileList = {
  label: string;
  files: File[];
  length: number;
};

//Filelist()接收文件路径的深度和目录深度（用于递归），并返回文件列表的数组和字符总数。
export function fileList(dirPath: string): FileList {
  let characterCount = 0;
  const filesInFolder = getFiles(dirPath);

  //  console.log("files from system:", filesInFolder);

  const labelOfList = path.basename(dirPath);
  const files: File[] = [];

  for (const dirent of filesInFolder) {
    if (dirent.isDirectory() && dirent.name == "publish") {
      //console.log("publish folder");
    } else if (dirent.name.match(/^\..*/)) {
      //console.log("invisible docs");
    } else if (dirent.isDirectory()) {
      const fp = path.join(dirPath, dirent.name);
      const containerFiles = fileList(fp);

      files.push({
        directoryName: dirent.name,
        directoryLength: containerFiles.length,
      });

      characterCount += containerFiles.length;
      files.push(containerFiles.files);
    } else if (
      dirent.isFile() &&
      [".txt",".md",".markdown"].includes(path.extname(dirent.name))
    ) {
      // 字符计数
      let readingFile = fs.readFileSync(
        path.join(dirPath, dirent.name),
        "utf-8"
      );
      //排除未从https://github.com/8amjp/vsce-charactercount计算的字符
      readingFile = removeNonContentCharacter(readingFile);
      files.push({
        dir: path.join(dirPath, dirent.name),
        name: dirent.name,
        length: countContentCharacter(readingFile),
      });
      characterCount += countContentCharacter(readingFile);
    }
  }
  //返回文件列表和字符总数
  return {
    label: labelOfList,
    files: files.flat(),
    length: characterCount,
  };
}

function getFiles(dirPath: string) {
  //console.log("getFiles",dirPath);
  const filesInFolder = fs.existsSync(dirPath)
    ? fs.readdirSync(dirPath, { withFileTypes: true })
    : [];
  if (!filesInFolder) console.log(`找不到"${dirPath}"`);
  return filesInFolder;
}

type FileNode = {
  dir: string;
  name: string;
  length: number;
};

export function draftsObject(dirPath: string): FileNode[] {
  const results: FileNode[] = [];

  const filesInFolder = getFiles(dirPath);

  for (const dirent of filesInFolder) {
    if (dirent.isDirectory() && dirent.name == "publish") {
      console.log("publish folder");
    } else if (dirent.name.match(/^\..*/)) {
      //console.log('invisible docs');
    } else if (dirent.isDirectory() && dirent.name == "dict") {
      console.log("dictionary folder");
    } else if (dirent.isDirectory()) {
      const directoryPath = path.join(dirPath, dirent.name);
      const containerFiles = draftsObject(directoryPath);

      let containerLength = 0;
      containerFiles.forEach((element) => {
        containerLength += element.length;
      });

      const directory = {
        dir: path.join(dirPath, dirent.name),
        name: dirent.name,
        length: containerLength,
        children: containerFiles,
      };

      results.push(directory);
    } else if (
      dirent.isFile() &&
      [".txt",".md",".markdown"].includes(path.extname(dirent.name))
    ) {
      //文字数カウントテスト
      let readingFile = fs.readFileSync(
        path.join(dirPath, dirent.name),
        "utf-8"
      );
      //カウントしない文字を除外 from https://github.com/8amjp/vsce-charactercount by MIT license
      // readingFile = readingFile
      //   .replace(/\s/g, "") // すべての空白文字
      //   .replace(/《(.+?)》/g, "") // ルビ範囲指定記号とその中の文字
      //   .replace(/[|｜]/g, "") // ルビ開始記号
      //   .replace(/<!--(.+?)-->/, ""); // コメントアウト
      readingFile = removeNonContentCharacter(readingFile);

      const fileNode = {
        dir: path.join(dirPath, dirent.name),
        name: dirent.name,
        length: countContentCharacter(readingFile),
      };
      results.push(fileNode);
    }
  }
  return results;
}

export function totalLength(dirPath: string): number {
  let result = 0;
  const drafts = draftsObject(dirPath);
  drafts.forEach((element) => {
    result += element.length;
  });
  return result;
}
