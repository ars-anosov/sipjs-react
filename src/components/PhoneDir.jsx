import DialpadIcon from "@mui/icons-material/Dialpad";
import MailIcon from "@mui/icons-material/Mail";
import PhoneIcon from "@mui/icons-material/Phone";
import { Alert, Autocomplete, Box, createFilterOptions, IconButton, Snackbar, TextField, Tooltip, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";

const filter = createFilterOptions();

function PhoneDir(props) {
  if (import.meta.env.DEV) console.log("PhoneDir hook");

  const { phoneControlActions } = props;

  const [dirPart, setDirPart] = useState("");
  const [options, setOptions] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const getPhoneDirRef = useRef(phoneControlActions.getPhoneDir);
  useEffect(() => {
    getPhoneDirRef.current = phoneControlActions.getPhoneDir;
  }, [phoneControlActions.getPhoneDir]);

  const handleCloseSnackbar = (_event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (import.meta.env.DEV) console.log("PhoneDir MOUNT");

    const fetchData = async () => {
      const fetchFn = getPhoneDirRef.current;
      if (fetchFn) {
        try {
          const data = await fetchFn();
          if (Array.isArray(data)) {
            setOptions(data);
          }
        } catch (error) {
          console.error("Ошибка загрузки справочника:", error);
        }
      }
    };
    fetchData();

    return () => {
      if (import.meta.env.DEV) console.log("PhoneDir UNMOUNT");
    };
  }, []);

  return (
    <>
      <Autocomplete
        freeSolo
        disablePortal
        options={options}
        size="small"
        forcePopupIcon={false}
        openOnFocus={false} // Запрещает открывать список при пустом клике мышкой
        disableClearable={dirPart.length === 0}
        inputValue={dirPart}
        onInputChange={(_event, newInputValue, reason) => {
          if (reason === "clear") {
            setDirPart("");
          } else {
            setDirPart(newInputValue);
          }
        }}
        // Условие "> 3" живёт в одном месте и управляет выдачей результатов
        filterOptions={(options, params) => {
          if (dirPart.length <= 3) return []; // Если символов мало — результатов нет
          return filter(options, {
            ...params,
            inputValue: dirPart,
          });
        }}
        getOptionLabel={(option) => {
          if (typeof option === "string") return option;
          return option.label || "";
        }}
        onChange={(event, _newValue, reason) => {
          if (reason === "selectOption") {
            event.preventDefault();
          }
        }}
        slotProps={{
          popper: {
            sx: {
              width: "350px !important",
              // Если результатов нет (длина < 4), полностью скрываем Popper, чтобы не было пустого окна
              display: dirPart.length <= 3 ? "none !important" : "block",
              "& .MuiAutocomplete-listbox": {
                width: "100%",
              },
            },
          },
          clearIndicator: {
            // Цвет контролов — из темы: шапка светлая (белый AppBar), цвет подписей и рамок
            // берётся из палитры.
            sx: { color: "text.secondary" },
          },
        }}
        sx={{
          width: 200,
          mx: 2,
        }}
        renderOption={(propsOption, option) => {
          const { key, ...optionProps } = propsOption;
          const targetValue = option.num || option.prefix || "";

          return (
            <Box
              key={key}
              component="li"
              {...optionProps}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {option.label}
                </Typography>
                <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                  {targetValue} {option.email}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                {option.num && (
                  <Tooltip title="В телефон" arrow>
                    <IconButton
                      color="primary"
                      onClick={() => {
                        phoneControlActions.handleChangeStore("calleePhoneNum", option.num);
                        phoneControlActions.handleChangeStore("displayPad", true);
                      }}
                    >
                      <PhoneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {option.prefix && (
                  <Tooltip title="В телефон" arrow>
                    <IconButton
                      color="primary"
                      onClick={() => {
                        phoneControlActions.handleChangeStore("calleePrefix", option.prefix);
                        phoneControlActions.handleChangeStore("addPrefix", true);
                        phoneControlActions.handleChangeStore("displayPad", true);
                      }}
                    >
                      <DialpadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {option.email && (
                  <Tooltip title="Копировать email" arrow>
                    <IconButton
                      color="info"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard
                          .writeText(option.email)
                          .then(() => {
                            setSnackbar({
                              open: true,
                              message: "Email скопирован!",
                              severity: "info",
                            });
                          })
                          .catch((err) => {
                            console.error("Ошибка копирования:", err);
                            setSnackbar({
                              open: true,
                              message: "Не удалось скопировать email",
                              severity: "error",
                            });
                          });
                      }}
                    >
                      <MailIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Поиск"
            sx={{
              "& .MuiInputLabel-root": { color: "text.secondary" },
              "& .MuiInputLabel-root.Mui-focused": { color: "primary.main" },
              "& .MuiInputBase-input": { color: "text.primary" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "text.secondary" },
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
              },
            }}
          />
        )}
      />

      <Snackbar open={snackbar.open} autoHideDuration={1000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

PhoneDir.propTypes = {
  phoneControlRdcr: PropTypes.object.isRequired,
  phoneControlActions: PropTypes.shape({
    getPhoneDir: PropTypes.func.isRequired,
    handleChangeStore: PropTypes.func.isRequired,
  }).isRequired,
};

export default PhoneDir;
