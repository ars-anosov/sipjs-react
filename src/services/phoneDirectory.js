import ky from "ky";
import { PHONE_URI_DIR_KEY } from "../constants/storage";

// Телефонный справочник: адрес хранится в localStorage, запрос идёт через ky.
// Сервис отдаёт данные как есть, преобразование ошибок — в action (kyError).

function getStoredPhoneDirUri() {
  return localStorage.getItem(PHONE_URI_DIR_KEY) || "";
}

async function fetchPhoneDir(uriPhoneDir) {
  return ky.get(uriPhoneDir).json();
}

export { fetchPhoneDir, getStoredPhoneDirUri };
