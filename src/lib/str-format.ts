export default function format(input: string, ...replacements: any[]): string {
    return input.replace(/{(\d+)}/g, function(match: string, index: number) { 
        return typeof replacements[index] != 'undefined'
          ? replacements[index]
          : match
        ;
    });
}