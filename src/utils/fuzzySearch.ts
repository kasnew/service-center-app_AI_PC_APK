import Fuse from 'fuse.js';

const layoutMap: Record<string, string> = {
    'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з', '[': 'х', ']': 'ї',
    'a': 'ф', 's': 'і', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д', ';': 'ж', "'": 'є',
    'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь', ',': 'б', '.': 'ю',
    'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З', '{': 'Х', '}': 'Ї',
    'A': 'Ф', 'S': 'І', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л', 'L': 'Д', ':': 'Ж', '"': 'Є',
    'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь', '<': 'Б', '>': 'Ю',
    'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ї': ']',
    'ф': 'a', 'і': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'є': "'",
    'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm', 'б': ',', 'ю': '.',
};

function convertLayout(text: string): string {
    return text.split('').map(char => layoutMap[char] || char).join('');
}

export function fuzzySearch<T>(list: T[], pattern: string, keys: string[]) {
    if (!pattern) return list;

    const options = {
        keys,
        threshold: 0.35,
        location: 0,
        distance: 100,
        minMatchCharLength: 2,
        ignoreLocation: true,
    };

    const fuse = new Fuse(list, options);

    // Search with original pattern
    let results = fuse.search(pattern);

    // Search with converted layout pattern
    const convertedPattern = convertLayout(pattern);
    if (convertedPattern !== pattern) {
        const convertedResults = fuse.search(convertedPattern);
        // Merge results, removing duplicates
        const seenIds = new Set(results.map((r: any) => (r.item as any).id || JSON.stringify(r.item)));
        convertedResults.forEach((res: any) => {
            const id = (res.item as any).id || JSON.stringify(res.item);
            if (!seenIds.has(id)) {
                results.push(res);
                seenIds.add(id);
            }
        });
    }

    return results.map((result: any) => result.item);
}
