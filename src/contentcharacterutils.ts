const ContentCharacterReHan = "\u4e00-\u9fa5"; // Not match 「〇」
const ContentCharacterReHanPunctuation = "（）【】，。；：“”‘’！？";
const ContentCharacterReEng = "0-9a-z";
const ContentCharacterReEngWord = "[0-9-]+|[a-z-]+";
const ContentCharacterReEngPunctuation = ",;~?()";

export function GenContentFilter(flags: string): RegExp {
    interface Flag2Exp { 'flag': string, 'exp': string }
    const flagMap: Flag2Exp[] = [
        { 'flag': 'h', 'exp': ContentCharacterReHan },
        { 'flag': 'H', 'exp': ContentCharacterReHan + ContentCharacterReHanPunctuation },
        { 'flag': 'e', 'exp': ContentCharacterReEng },
        { 'flag': 'E', 'exp': ContentCharacterReEng + ContentCharacterReEngPunctuation },
        { 'flag': '.', 'exp': ContentCharacterReEngPunctuation }
    ];

    const exp: string = flagMap.reduce(
        (acc, { flag, exp }) => flags.includes(flag) ? acc + exp : acc,
        flags.includes('^') ? '[^' : '['
    );

    let finalExp: string = exp;
    if (flags.includes('w')) {
        finalExp = exp.match(/^\[\^?$/) ? ContentCharacterReEngWord : `${exp}]|${ContentCharacterReEngWord}` ;
    } else {
        finalExp += ']'
    }

    const regExpFlagMap: Flag2Exp[] = [
        { 'flag': 'g', 'exp': 'g' },
        { 'flag': 'i', 'exp': 'i' }
    ];

    const regExpFlags: string = regExpFlagMap.reduce(
        (acc, { flag, exp }) => flags.includes(flag) ? acc + exp : acc, '');

    const res =  new RegExp(finalExp, regExpFlags);
    return res
}

export function removeTags(doc: string): string {
    let res =  doc.startsWith('#') ? doc.substring(doc.indexOf('\n')) : doc;
    res = res.trim();
    res = res
        .replace(/@\{(.+?)(?!\\)\}/g, '@')
        .replace(/@([a-zA-Z0-9_-]+)(\[(([a-zA-Z0-9_-]|\s)+)\])?/g, '')
        .replace(/<!--(.+?)-->/, "")
        ;
    return res;
}

export function countContentCharacter(doc: string): number {
    doc = removeTags(doc);
    doc = doc.replace(/-+/gi,'');
    const count = doc.match(GenContentFilter('H.gi'));
    const halfCount = doc.match(GenContentFilter("wgi"));
    return (count ? count.length : 0) + (halfCount ? halfCount.length : 0);
}

export function removeNonContentCharacter(doc: string): string {
    doc = removeTags(doc);
    return doc
        .replace(/\s|\n|-+/g, "")
        .replace(/《(.+?)》/g, "") // 红宝石范围指定的符号和字符
        .replace(/[|｜]/g, "") // 红宝石启动符号
        .replace(GenContentFilter('^HEgi'),'');
}