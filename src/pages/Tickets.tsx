import React, { useState } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Progress,
  Divider,
  Input,
} from '@chakra-ui/react';

interface Message {
  id: number;
  user: string;
  content: string;
  timestamp: string;
  isStaff: boolean;
}

interface Ticket {
  id: number;
  title: string;
  status: string;
  priority: string;
  created: string;
  sla: {
    total: number;
    remaining: number;
  };
  messages: Message[];
}

const TicketDetails: React.FC<{ ticket: Ticket, onClose: () => void }> = ({ ticket, onClose }) => {
  const [newMessage, setNewMessage] = useState('');
  const slaPercentage = (ticket.sla.remaining / ticket.sla.total) * 100;

  const handleSendMessage = () => {
    // Implementar envio de mensagem
    setNewMessage('');
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Chamado #{ticket.id} - {ticket.title}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            <Box>
              <Text fontWeight="bold">Status do SLA</Text>
              <Progress 
                value={slaPercentage} 
                colorScheme={slaPercentage > 50 ? "green" : slaPercentage > 25 ? "yellow" : "red"}
              />
              <Text fontSize="sm">
                Tempo restante: {ticket.sla.remaining}h
              </Text>
            </Box>

            <Divider />

            <Box flex={1} maxH="300px" overflowY="auto">
              {ticket.messages.map(msg => (
                <Box 
                  key={msg.id}
                  bg={msg.isStaff ? "blue.50" : "gray.50"}
                  p={3}
                  borderRadius="md"
                  mb={2}
                >
                  <Text fontWeight="bold">{msg.user}</Text>
                  <Text>{msg.content}</Text>
                  <Text fontSize="xs" color="gray.500">{msg.timestamp}</Text>
                </Box>
              ))}
            </Box>

            <HStack>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
              />
              <Button colorScheme="blue" onClick={handleSendMessage}>
                Enviar
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

const TicketsPage: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const tickets: Ticket[] = [
    {
      id: 1,
      title: 'Problema com Login',
      status: 'aberto',
      priority: 'alta',
      created: '2024-01-20',
      sla: { total: 24, remaining: 18 },
      messages: [
        { id: 1, user: 'João Silva', content: 'Não consigo acessar o sistema', timestamp: '10:30', isStaff: false },
        { id: 2, user: 'Suporte TI', content: 'Estamos verificando o problema', timestamp: '10:35', isStaff: true },
      ],
    },
    { id: 2, title: 'Erro no Sistema', status: 'pendente', priority: 'média', created: '2024-01-19', sla: { total: 24, remaining: 12 }, messages: [] },
  ];

  return (
    <Box p={5}>
      <Table variant="simple" bg="white" borderRadius="lg">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Título</Th>
            <Th>Status</Th>
            <Th>Prioridade</Th>
            <Th>SLA</Th>
            <Th>Ações</Th>
          </Tr>
        </Thead>
        <Tbody>
          {tickets.map(ticket => (
            <Tr key={ticket.id}>
              <Td>#{ticket.id}</Td>
              <Td>{ticket.title}</Td>
              <Td>
                <Badge colorScheme={ticket.status === 'aberto' ? 'green' : 'yellow'}>
                  {ticket.status}
                </Badge>
              </Td>
              <Td>{ticket.priority}</Td>
              <Td>
                <Progress 
                  value={(ticket.sla.remaining / ticket.sla.total) * 100} 
                  size="sm" 
                  width="100px"
                />
              </Td>
              <Td>
                <Button size="sm" onClick={() => setSelectedTicket(ticket)}>
                  Ver Detalhes
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {selectedTicket && (
        <TicketDetails 
          ticket={selectedTicket} 
          onClose={() => setSelectedTicket(null)} 
        />
      )}
    </Box>
  );
};

export default TicketsPage;