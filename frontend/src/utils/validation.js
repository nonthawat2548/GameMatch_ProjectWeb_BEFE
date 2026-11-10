// Go ใช้ len(string) ซึ่งนับ UTF-8 bytes; maxLength ของ HTML นับตัวอักษรต่างกัน
export function utf8Length(value) {
  return new Blob([value]).size;
}

export function passwordError(value) {
  if (value.length < 8 || utf8Length(value) > 72) {
    return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์';
  }
  return '';
}
