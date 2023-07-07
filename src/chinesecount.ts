export const ChineseCharacterRe = /[\u4e00-\u9fa5,;~?()（）【】，。；：“”‘’！？]/gi;
export const nonChineseCharacterRe = /[^\u4e00-\u9fa50-9a-z,~;?()（）【】，。；：“”‘’！？]/gi;

export function countChineseCharacter(doc: string): number {
    if(doc.startsWith('#')){
        doc = doc.substring(doc.indexOf('\n'));
    }
    doc = doc.replace(/-+/gi,'');
    const count = doc.match(ChineseCharacterRe);
    const halfCount = doc.match(/[0-9-]+|[a-z-]+/gi);
    return (count ? count.length : 0) + (halfCount ? halfCount.length : 0);
}

export function removeNonChineseCharacter(doc: string): string {
    return doc
        .replace(/\s|\n/g, "")
        // .replace(/((\S+?)|\{(.+?)\})?@([a-zA-Z0-9_]*?)(\[[a-zA-Z0-9_\s]+?\])?/g, "") // 实体标记
        .replace(/@([a-zA-Z0-9_]*?)(\[[a-zA-Z0-9_\s]+?\])?/g, "") // 实体标记
        .replace(/《(.+?)》/g, "") // 红宝石范围指定的符号和字符
        .replace(/[|｜]/g, "") // 红宝石启动符号
        .replace(/<!--(.+?)-->/, "") // 注释
        .replace(nonChineseCharacterRe,'');
}