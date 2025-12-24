from config_decryptor import ConfigDecryptor
import configparser
class ETLConfigLoader:
    def __init__(self, enc_config_path):
        self.db_config = self._load_config(enc_config_path)

    def _load_config(self, enc_path):
        decryptor = ConfigDecryptor()
        decrypted = decryptor.decrypt_config(enc_path)

        parser = configparser.ConfigParser()
        parser.read_string(decrypted)

        if "postgreSQL" not in parser:
            raise RuntimeError("[postgreSQL] section missing in config")

        cfg = parser["postgreSQL"]

        required = ["host", "port", "user", "password", "database"]
        for key in required:
            if key not in cfg:
                raise RuntimeError(f"Missing key in config: {key}")

        return {
            "host": cfg["host"],
            "port": int(cfg["port"]),
            "user": cfg["user"],
            "password": cfg["password"],
            "dbname": cfg["database"],
        }
