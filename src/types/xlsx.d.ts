declare module 'xlsx' {
  export const utils: {
    json_to_sheet: (data: any[], opts?: any) => any;
    book_new: () => any;
    book_append_sheet: (workbook: any, worksheet: any, name?: string) => void;
    sheet_to_json: (sheet: any, opts?: any) => any[];
    aoa_to_sheet: (data: any[][], opts?: any) => any;
    decode_range: (range: string) => { s: { r: number; c: number }; e: { r: number; c: number } };
    encode_cell: (cell: { r: number; c: number }) => string;
    encode_range: (range: { s: { r: number; c: number }; e: { r: number; c: number } }) => string;
  };
  export function read(data: any, opts?: any): any;
  export function write(workbook: any, opts?: any): any;
  export function writeFile(workbook: any, filename: string, opts?: any): void;
  export function readFile(filename: string, opts?: any): any;
}
