from cryptography.fernet import Fernet

# Generiere einen Schlüssel und speichere ihn in einer Datei (einmalig ausführen)
def generate_key():
    key = Fernet.generate_key()
    with open("secret.key", "wb") as key_file:
        key_file.write(key)

# Verschlüssle die Datei
def encrypt_file(filename):
    with open("secret.key", "rb") as key_file:
        key = key_file.read()
    fernet = Fernet(key)

    with open(filename, "rb") as file:
        original = file.read()

    encrypted = fernet.encrypt(original)

    with open(f"{filename}.enc", "wb") as encrypted_file:
        encrypted_file.write(encrypted)

# Beispielaufruf
generate_key()
encrypt_file("config.ini")