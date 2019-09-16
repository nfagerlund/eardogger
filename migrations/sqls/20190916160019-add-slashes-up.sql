UPDATE dogears SET current_protocol = current_protocol || '://' WHERE NOT current_protocol LIKE '%://';
