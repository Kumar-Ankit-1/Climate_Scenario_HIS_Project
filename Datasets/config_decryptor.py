import os
from cryptography.fernet import Fernet

class ConfigDecryptor:
    def __init__(self):
        """
        Initialisiert den ConfigDecryptor mit dem Namen der Umgebungsvariablen.

        :param env_var_name: Name der Umgebungsvariablen, die den Schlüssel enthält.
        """

    def _load_key_from_env(self):
        """Lädt den Schlüssel aus einer Umgebungsvariablen."""
        key = 'reRZe7C9PO8m2JNJDfZjYmYGypjPHvNI3Kbt4fzwIuU='
        if not key:
            raise RuntimeError(f"Die Umgebungsvariable {self.env_var_name} ist nicht gesetzt.")
        return key.encode()

    def decrypt_config(self, filename):
        """
        Entschlüsselt die Konfigurationsdatei.

        :param filename: Pfad zur verschlüsselten Konfigurationsdatei.
        :return: Entschlüsselte Konfiguration als String.
        """
        try:
            # Schlüssel aus Umgebungsvariablen laden
            key = self._load_key_from_env()
            fernet = Fernet(key)

            # Datei entschlüsseln
            with open(filename, 'rb') as enc_file:
                encrypted_data = enc_file.read()

            decrypted_data = fernet.decrypt(encrypted_data)
            return decrypted_data.decode()
        except Exception as e:
            raise RuntimeError(f"Fehler bei der Entschlüsselung: {e}")
