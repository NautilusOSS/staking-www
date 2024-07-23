import React, { ReactElement } from "react";
import "./ContractPicker.scss";
import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import { ArrowDropDown, Done } from "@mui/icons-material";
import { RootState, useAppDispatch } from "../../Redux/store";
import { useSelector } from "react-redux";
import { CoreStaker } from "@repo/voix";
import { initAccountData } from "../../Redux/staking/userReducer";
import { theme } from "@repo/theme";

function ContractPicker(): ReactElement {
  const [menuAnchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { account } = useSelector((state: RootState) => state.user);

  const dispatch = useAppDispatch();

  const { availableContracts, data } = account;

  function closeMenu() {
    setAnchorEl(null);
  }

  return (
    <div className="contract-picker-wrapper">
      <div className="contract-picker-container">
        <div>
          {data && availableContracts.length > 0 && (
            <div>
              <Button
                variant="outlined"
                color="primary"
                className="blacffk-button"
                endIcon={<ArrowDropDown></ArrowDropDown>}
                onClick={(ev) => {
                  setAnchorEl(ev.currentTarget);
                }}
              >
                {new CoreStaker(data).contractId()}
              </Button>
              <Menu
                anchorEl={menuAnchorEl}
                className="classic-menu"
                open={Boolean(menuAnchorEl)}
                disableAutoFocusItem={true}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                PaperProps={{
                  sx: {
                    transform: "translateX(0px) translateY(5px) !important",
                  },
                }}
                onClose={closeMenu}
              >
                {availableContracts.map((accountData) => {
                  const staker = new CoreStaker(accountData);
                  return (
                    <MenuItem
                      key={staker.contractId()}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                        closeMenu();
                        dispatch(initAccountData(accountData));
                      }}
                    >
                      <ListItemIcon>
                        {data.contractId === staker.contractId() ? (
                          <Done
                            fontSize="small"
                            sx={{ color: theme.palette.common.black }}
                          />
                        ) : (
                          ""
                        )}
                      </ListItemIcon>
                      <ListItemText disableTypography>
                        {staker.contractId()}
                      </ListItemText>
                    </MenuItem>
                  );
                })}
              </Menu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContractPicker;
