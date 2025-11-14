import React from 'react'
import {
  Box,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Heading,
} from '@chakra-ui/react'

const Dashboard: React.FC = () => {
  const recentTickets = [
    { id: 1, title: 'Erro no sistema', status: 'aberto', priority: 'alta', updated: '2h atrás' },
    { id: 2, title: 'Problema de acesso', status: 'pendente', priority: 'média', updated: '5h atrás' },
  ]

  return (
    <Box p={5}>
      <Heading size="lg" mb={6}>Dashboard</Heading>

      <Grid templateColumns="repeat(4, 1fr)" gap={6} mb={8}>
        <Stat bg="white" p={5} borderRadius="lg" shadow="sm">
          <StatLabel>Total de Chamados</StatLabel>
          <StatNumber>150</StatNumber>
          <StatHelpText>+5% desde último mês</StatHelpText>
        </Stat>
        
        <Stat bg="white" p={5} borderRadius="lg" shadow="sm">
          <StatLabel>Em Aberto</StatLabel>
          <StatNumber>15</StatNumber>
          <StatHelpText>8 críticos</StatHelpText>
        </Stat>

        <Stat bg="white" p={5} borderRadius="lg" shadow="sm">
          <StatLabel>Resolvidos Hoje</StatLabel>
          <StatNumber>12</StatNumber>
          <StatHelpText>90% taxa de resolução</StatHelpText>
        </Stat>

        <Stat bg="white" p={5} borderRadius="lg" shadow="sm">
          <StatLabel>Tempo Médio</StatLabel>
          <StatNumber>2.5h</StatNumber>
          <StatHelpText>-30min que ontem</StatHelpText>
        </Stat>
      </Grid>

      <Box bg="white" p={5} borderRadius="lg" shadow="sm">
        <Heading size="md" mb={4}>Chamados Recentes</Heading>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Título</Th>
              <Th>Status</Th>
              <Th>Prioridade</Th>
              <Th>Última Atualização</Th>
            </Tr>
          </Thead>
          <Tbody>
            {recentTickets.map(ticket => (
              <Tr key={ticket.id}>
                <Td>#{ticket.id}</Td>
                <Td>{ticket.title}</Td>
                <Td>
                  <Badge colorScheme={ticket.status === 'aberto' ? 'green' : 'yellow'}>
                    {ticket.status}
                  </Badge>
                </Td>
                <Td>{ticket.priority}</Td>
                <Td>{ticket.updated}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  )
}

export default Dashboard
