'use client';
import * as React from 'react';
import ListSubheader from '@mui/material/ListSubheader';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import {LocalDining} from "@mui/icons-material";
import {Chip} from "@mui/material";

export default function MainList() {
  const [open, setOpen] = React.useState(true);

  const handleClick = () => {
    setOpen(!open);
  };

  return (
      <List
          sx={{ width: '100%', maxWidth: 480, bgcolor: 'background.paper' }}
          component="nav"
          aria-labelledby="nested-list-subheader"
          subheader={
            <ListSubheader component="div" id="nested-list-subheader">
              Nested List Items
            </ListSubheader>
          }
      >
        <ListItemButton onClick={handleClick}>
          <ListItemIcon>
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemIcon>
          <ListItemText primary="Expenses" />
        </ListItemButton>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton>
              <ListItemIcon>
                <LocalDining />
              </ListItemIcon>
              <ListItemText primary="Eating Out" />
              <Chip label="$100" />
            </ListItemButton>
          </List>
        </Collapse>
      </List>
  );
}
