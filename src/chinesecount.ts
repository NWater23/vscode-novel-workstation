export function countChineseCharacter(doc: string): number {
    const count = doc.match(/[\u4e00-\u9fa5]/g);
    return count ? count.length : 0;
}