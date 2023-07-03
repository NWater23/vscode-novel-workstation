export function countChineseCharacter(doc: string): number {
    const count = doc.match(/[\u4e00-\u9fa5]/g);
    return count ? count.length : 0;
}

export function removeNonChineseCharacter(doc: string): string {
    return doc
        .replace(/\s|\n/g, "")
        // .replace(/((\S+?)|\{(.+?)\})?@([a-zA-Z0-9_]*?)(\[[a-zA-Z0-9_\s]+?\])?/g, "") // 实体标记
        .replace(/@([a-zA-Z0-9_]*?)(\[[a-zA-Z0-9_\s]+?\])?/g, "") // 实体标记
        .replace(/《(.+?)》/g, "") // 红宝石范围指定的符号和字符
        .replace(/[|｜]/g, "") // 红宝石启动符号
        .replace(/<!--(.+?)-->/, "") // 注释
        .replace(/[^\u4e00-\u9fa5]/g,'');
}