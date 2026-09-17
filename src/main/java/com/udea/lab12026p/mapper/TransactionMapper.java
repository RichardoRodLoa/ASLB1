package com.udea.lab12026p.mapper;

import com.udea.lab12026p.dto.TransactionDTO;
import com.udea.lab12026p.entity.Transaction;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

@Mapper
public interface TransactionMapper {
 TransactionMapper INSTANCE = Mappers.getMapper(TransactionMapper.class);
 TransactionDTO toDTO(Transaction transaction);
}
