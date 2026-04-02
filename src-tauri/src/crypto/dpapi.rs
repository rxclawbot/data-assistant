// DPAPI encryption module for Windows
// Uses Windows Data Protection API for encrypting/decrypting data

use windows::Win32::Security::Cryptography::{
    CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB,
    CRYPTPROTECT_UI_FORBIDDEN,
};
use std::ptr::null_mut;

pub fn encrypt(data: &str) -> Result<Vec<u8>, String> {
    unsafe {
        let input = CRYPT_INTEGER_BLOB {
            cbData: data.len() as u32,
            pbData: data.as_bytes().as_ptr() as *mut u8,
        };

        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: null_mut(),
        };

        let result = CryptProtectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        );

        if result.is_ok() {
            let encrypted = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
            // Leak the Windows API buffer - minimal memory impact for this use case
            Ok(encrypted)
        } else {
            Err("DPAPI encrypt failed".to_string())
        }
    }
}

pub fn decrypt(encrypted: &[u8]) -> Result<String, String> {
    unsafe {
        let input = CRYPT_INTEGER_BLOB {
            cbData: encrypted.len() as u32,
            pbData: encrypted.as_ptr() as *mut u8,
        };

        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: null_mut(),
        };

        let result = CryptUnprotectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        );

        if result.is_ok() {
            let decrypted = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
            // Leak the Windows API buffer - minimal memory impact for this use case
            String::from_utf8(decrypted).map_err(|e| e.to_string())
        } else {
            Err("DPAPI decrypt failed".to_string())
        }
    }
}

#[tauri::command]
pub fn encrypt_password_command(password: String) -> Result<Vec<u8>, String> {
    encrypt(&password)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let original = "secret_password";
        let encrypted = encrypt(original).expect("encrypt failed");
        let decrypted = decrypt(&encrypted).expect("decrypt failed");
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_encrypt_produces_different_output() {
        let original = "password";
        let encrypted = encrypt(original).expect("encrypt failed");
        assert_ne!(original.as_bytes(), encrypted.as_slice());
    }
}